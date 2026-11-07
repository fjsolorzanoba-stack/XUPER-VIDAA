<#
  Instalador de XuperTV para televisores LG webOS 4.

  Pensado para gente sin conocimientos tecnicos: se ejecuta con doble clic en
  INSTALAR-XUPERTV.bat, pregunta la IP del televisor y hace todo lo demas.

  Que hace:
    1. Busca el IPK junto al instalador (o en dist/).
    2. Comprueba que el televisor responde en el puerto 22.
    3. Sube el IPK por SCP a /media/developer/temp.
    4. Lo instala con el servicio de instalacion de webOS (Luna).
    5. Espera a que la version instalada sea la del IPK.
    6. Comprueba que ffmpeg quedo ejecutable (necesario para el Modo fluido).
    7. Abre la app en el televisor.

  No necesita Node.js ni ares-cli: usa el cliente SSH que ya trae Windows 10/11.

  Uso normal:
    Doble clic en INSTALAR-XUPERTV.bat

  Uso avanzado (sin preguntas):
    powershell -ExecutionPolicy Bypass -File instalar-tv.ps1 -Ipk ruta\app.ipk -TvHost 192.168.1.50

  Comprobar sin tocar la TV:
    powershell -ExecutionPolicy Bypass -File instalar-tv.ps1 -DryRun
#>

[CmdletBinding()]
param(
    [string]$Ipk,
    [string]$TvHost,
    [string]$TvUser,
    [int]$Port = 0,
    [switch]$DryRun,
    [switch]$NoPause,
    # Solo lectura: no instala nada. Entra por SSH, mira por que el servicio no
    # arranca y guarda el resultado en diagnostico-xupertv-tv.txt
    [switch]$Diagnose
)

$ErrorActionPreference = 'Stop'

$AppId      = 'com.webosflux.xuptertv.fidelity'
$SvcId      = 'com.webosflux.xuptertv.fidelity.service'
$AppDir     = "/media/developer/apps/usr/palm/applications/$AppId"
$SvcDir     = "/media/developer/apps/usr/palm/services/$SvcId"
# Persistir por usuario, no junto al ZIP: así una actualización del instalador
# conserva la TV y la clave cifrada sin incluir datos privados al compartirlo.
$LegacyConfigFile = Join-Path $PSScriptRoot 'instalar-config.json'
$ConfigDir = if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA 'XuperTV' } else { $PSScriptRoot }
$ConfigFile = Join-Path $ConfigDir 'installer.json'
$script:LastExit = 0
$script:Fail = 0
$script:KeyPath = ''
$script:KeyDir = ''
$script:UseKey = $false
$script:KeyIsRsa = $false
$script:DiagLog = ''
$script:KeyError = ''
$script:LastTransferError = ''
$script:RootMode = ($TvUser -eq 'root')
# Si el usuario viene por parametro (o se elige "TV con root") no se prueban
# otros nombres de cuenta: se usa ese y punto.
$script:UserExplicit = -not [string]::IsNullOrWhiteSpace($TvUser)

# ---------------------------------------------------------------- apariencia
function Line { Write-Host ('  ' + ('-' * 68)) -ForegroundColor DarkGray }
function Title($t) { Write-Host ''; Write-Host ('  ' + $t) -ForegroundColor White }
function Step($n, $t) { Write-Host ''; Write-Host ("  [$n] " + $t) -ForegroundColor Cyan }
function Ok($t) { Write-Host ('      OK   ' + $t) -ForegroundColor Green }
function Warn($t) { Write-Host ('      !    ' + $t) -ForegroundColor Yellow }
function Fail($t) { Write-Host ('      X    ' + $t) -ForegroundColor Red }
function Info($t) { Write-Host ('           ' + $t) -ForegroundColor Gray }

function Show-Banner {
    Clear-Host
    Write-Host ''
    Write-Host '   ==================================================================' -ForegroundColor Red
    Write-Host '      X u p e r T V   para   L G   w e b O S' -ForegroundColor White
    Write-Host '      Instalador automatico - no hace falta saber informatica' -ForegroundColor DarkGray
    Write-Host '   ==================================================================' -ForegroundColor Red
}

function Pause-End {
    Remove-TvKey
    if ($NoPause) { return }
    Write-Host ''
    Read-Host '   Pulsa ENTER para cerrar esta ventana' | Out-Null
}

# ---------------------------------------------------------------- utilidades
function Read-WithDefault($prompt, $default) {
    if ($default) {
        $v = Read-Host ('   ' + $prompt + ' [' + $default + ']')
    } else {
        $v = Read-Host ('   ' + $prompt)
    }
    if ([string]::IsNullOrWhiteSpace($v)) { return $default }
    return $v.Trim()
}

function Test-IPv4($text) {
    if ($text -notmatch '^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$') { return $false }
    foreach ($n in $Matches[1..4]) { if ([int]$n -gt 255) { return $false } }
    return $true
}

function Test-Port($computer, $tcpPort, $timeoutMs = 3000) {
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $iar = $client.BeginConnect($computer, $tcpPort, $null, $null)
        if (-not $iar.AsyncWaitHandle.WaitOne($timeoutMs)) { return $false }
        $client.EndConnect($iar)
        return $true
    } catch {
        return $false
    } finally {
        try { $client.Close() } catch { }
    }
}

function Test-Host($text) {
    # Vale una IP o un nombre de equipo (lg-tv.local).
    if (Test-IPv4 $text) { return $true }
    return ($text -match '^[A-Za-z0-9][A-Za-z0-9.-]{0,62}$')
}

function Get-LocalIPv4 {
    # IPs de este PC: sirven para comparar con la de la TV y para escanear.
    $out = @()
    try {
        $addrs = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254.*' }
        foreach ($a in $addrs) {
            $out += [pscustomobject]@{ IP = [string]$a.IPAddress; Prefix = [int]$a.PrefixLength }
        }
    } catch {
        try {
            $nics = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
                Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' }
            foreach ($n in $nics) {
                foreach ($u in $n.GetIPProperties().UnicastAddresses) {
                    if ($u.Address.AddressFamily -eq 'InterNetwork') {
                        $out += [pscustomobject]@{ IP = $u.Address.ToString(); Prefix = 24 }
                    }
                }
            }
        } catch { }
    }
    $seen = @{}
    $list = @()
    foreach ($o in $out) {
        if ($o.IP -and -not $seen.ContainsKey($o.IP)) { $seen[$o.IP] = $true; $list += $o }
    }
    return $list
}

function Get-NetworkNumber([string]$ip, [int]$prefix) {
    if ($prefix -lt 1 -or $prefix -gt 32) { $prefix = 24 }
    $b = [System.Net.IPAddress]::Parse($ip).GetAddressBytes()
    [uint64]$v = ([uint64]$b[0] * 16777216) + ([uint64]$b[1] * 65536) + ([uint64]$b[2] * 256) + [uint64]$b[3]
    [uint64]$mask = [uint64]([math]::Pow(2, 32) - [math]::Pow(2, 32 - $prefix))
    return ($v -band $mask)
}

function Test-SameLan([string]$ip, $locals) {
    # Devuelve la IP local que comparte red con $ip, o $null.
    if (-not (Test-IPv4 $ip)) { return $null }
    foreach ($l in $locals) {
        if ((Get-NetworkNumber $ip $l.Prefix) -eq (Get-NetworkNumber $l.IP $l.Prefix)) { return $l.IP }
    }
    return $null
}

function Find-SshHosts($locals, [int[]]$ports = @(22, 9922)) {
    # Busca en la red local aparatos con el SSH del modo desarrollador abierto.
    # Las TV LG suelen usar el 9922 (y a veces tambien el 22). Va por tandas
    # para tardar pocos segundos.
    $found = @()
    foreach ($l in $locals) {
        $p = $l.IP.Split('.')
        $base = $p[0] + '.' + $p[1] + '.' + $p[2]
        $batch = 64
        for ($start = 1; $start -le 254; $start += $batch) {
            $tasks = @()
            $end = [Math]::Min($start + $batch - 1, 254)
            for ($h = $start; $h -le $end; $h++) {
                $ip = "$base.$h"
                if ($ip -eq $l.IP) { continue }
                foreach ($tcpPort in $ports) {
                    $c = New-Object System.Net.Sockets.TcpClient
                    try {
                        $tasks += [pscustomobject]@{
                            IP = $ip
                            Port = $tcpPort
                            Client = $c
                            Async = $c.BeginConnect($ip, $tcpPort, $null, $null)
                        }
                    } catch {
                        try { $c.Close() } catch { }
                    }
                }
            }
            Start-Sleep -Milliseconds 400
            foreach ($t in $tasks) {
                try {
                    if ($t.Async.AsyncWaitHandle.WaitOne(0)) {
                        $t.Client.EndConnect($t.Async)
                        if ($t.Client.Connected) {
                            $found += [pscustomobject]@{ IP = $t.IP; Port = $t.Port }
                        }
                    }
                } catch { }
                try { $t.Client.Close() } catch { }
            }
        }
    }
    # Si un equipo tiene los dos puertos, quedarse con el de LG (9922).
    $byIp = @{}
    foreach ($f in $found) {
        if (-not $byIp.ContainsKey($f.IP)) { $byIp[$f.IP] = $f }
        elseif ($f.Port -eq 9922) { $byIp[$f.IP] = $f }
    }
    return @($byIp.Values | Sort-Object IP)
}

function Find-SshPort([string]$ip, [int[]]$candidates, [int]$timeoutMs = 2500) {
    foreach ($p in $candidates) {
        if ($p -le 0) { continue }
        if (Test-Port $ip $p $timeoutMs) { return $p }
    }
    return 0
}

function Select-TvFromScan($locals) {
    if (-not $locals -or $locals.Count -eq 0) {
        Fail 'No encuentro la red de este ordenador.'
        Info 'Comprueba que el PC tiene WiFi o cable conectado.'
        return $null
    }
    Title 'Buscando la TV en tu red (unos segundos)...'
    Info 'Solo funciona si el Modo Desarrollador esta activo en la TV.'
    $found = @(Find-SshHosts $locals @(22, 9922))
    if ($found.Count -eq 0) {
        Warn 'No he encontrado ningun aparato con el modo desarrollador abierto.'
        Info 'Abre la app "Developer Mode" en la TV y comprueba que esta activada.'
        Info 'Despues escribe B otra vez, o copia la IP a mano.'
        return $null
    }
    if ($found.Count -eq 1) {
        Ok ('Encontrado: ' + $found[0].IP + '  (puerto ' + $found[0].Port + ')')
        $confirm = Read-WithDefault 'Es tu televisor? (s/n)' 's'
        if ($confirm -match '^[nN]') { return $null }
        return $found[0]
    }
    Title 'He encontrado varios aparatos. Cual es tu televisor?'
    for ($i = 0; $i -lt $found.Count; $i++) {
        Info (('{0}) {1}   (puerto {2})') -f ($i + 1), $found[$i].IP, $found[$i].Port)
    }
    $pick = Read-WithDefault 'Numero' '1'
    $idx = 1
    [void][int]::TryParse($pick, [ref]$idx)
    $idx = [Math]::Max(1, [Math]::Min($found.Count, $idx))
    return $found[$idx - 1]
}

$script:SshOptionCache = @{}

function Test-SshOption([string]$opt) {
    # OpenSSH antiguo no conoce algunas opciones: se comprueban antes de usarlas.
    # Ojo: si la entrada esta redirigida, ssh escribe un aviso por stderr y con
    # ErrorActionPreference=Stop eso se convertiria en error. Aqui no interesa.
    if ($script:SshOptionCache.ContainsKey($opt)) {
        return [bool]$script:SshOptionCache[$opt]
    }
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $null = & ssh -G -o $opt 127.0.0.1 2>$null
        $ok = ($LASTEXITCODE -eq 0)
    } catch {
        $ok = $false
    } finally {
        $ErrorActionPreference = $prev
    }
    $script:SshOptionCache[$opt] = $ok
    return $ok
}

function Get-PubkeyAlgName {
    # OpenSSH 8.5 cambio PubkeyAcceptedKeyTypes por PubkeyAcceptedAlgorithms.
    # Windows 10 20H2 (8.1) solo entiende el nombre viejo: si se usa el nuevo
    # ssh termina con "Bad configuration option".
    foreach ($name in @('PubkeyAcceptedAlgorithms', 'PubkeyAcceptedKeyTypes')) {
        if (Test-SshOption ($name + '=ssh-rsa')) { return $name }
    }
    try {
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        $ver = (& ssh -V 2>&1 | Out-String)
        $ErrorActionPreference = $prev
        if ($ver -match 'OpenSSH[_\s]+(?:for[_\s]+Windows[_\s]+)?([0-9]+)\.([0-9]+)') {
            $major = [int]$matches[1]
            $minor = [int]$matches[2]
            if ($major -gt 8 -or ($major -eq 8 -and $minor -ge 5)) {
                return 'PubkeyAcceptedAlgorithms'
            }
            return 'PubkeyAcceptedKeyTypes'
        }
    } catch { }
    return 'PubkeyAcceptedKeyTypes'
}

function Get-SshOpts {
    # Las TV LG con webOS 4 llevan OpenSSH 6.1: solo ssh-rsa y SHA-1, que
    # OpenSSH 9 rechaza por defecto. Se reactivan SOLO para esta conexion.
    $o = @(
        '-o', 'StrictHostKeyChecking=accept-new',
        '-o', 'ConnectTimeout=20',
        '-o', 'ServerAliveInterval=15',
        '-o', 'PreferredAuthentications=publickey,keyboard-interactive,password',
        '-o', 'NumberOfPasswordPrompts=3'
    )
    foreach ($pair in @(
        @('HostKeyAlgorithms', 'ssh-rsa'),
        @('KexAlgorithms', 'diffie-hellman-group14-sha1'),
        @('MACs', 'hmac-sha1')
    )) {
        $opt = $pair[0] + '=+' + $pair[1]
        if (Test-SshOption $opt) { $o += @('-o', $opt) }
    }
    $pubkeyName = Get-PubkeyAlgName
    if ($pubkeyName) {
        $optPlus = $pubkeyName + '=+ssh-rsa'
        if (Test-SshOption $optPlus) {
            $o += @('-o', $optPlus)
        } else {
            $o += @('-o', ($pubkeyName + '=ssh-rsa'))
        }
    }
    return $o
}

function Test-ScpLegacy {
    # scp 9+ usa SFTP por defecto; las TV webOS 4 solo entienden el scp antiguo
    # (-O). Se mira si este Windows soporta -O antes de usarlo.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $usage = (& scp 2>&1 | Out-String)
    } catch {
        $usage = ''
    } finally {
        $ErrorActionPreference = $prev
    }
    return ($usage -match '\[-[0-9A-Za-z]*O[0-9A-Za-z]*\]')
}

function Get-IpkCandidate {
    param([string]$explicit)

    if ($explicit) {
        if (-not (Test-Path -LiteralPath $explicit)) { throw "No existe el archivo: $explicit" }
        return (Resolve-Path -LiteralPath $explicit).Path
    }

    $roots = @(
        $PSScriptRoot,
        (Join-Path $PSScriptRoot 'dist'),
        (Split-Path $PSScriptRoot -Parent),
        (Join-Path (Split-Path $PSScriptRoot -Parent) 'dist')
    )
    $seen = @{}
    $list = @()
    foreach ($r in $roots) {
        if (-not $r) { continue }
        if (-not (Test-Path -LiteralPath $r)) { continue }
        foreach ($f in (Get-ChildItem -LiteralPath $r -Filter '*.ipk' -File -ErrorAction SilentlyContinue)) {
            if (-not $seen.ContainsKey($f.FullName)) {
                $seen[$f.FullName] = $true
                $list += $f
            }
        }
    }
    $list = @($list | Sort-Object LastWriteTime -Descending)
    if ($list.Count -eq 0) { return $null }
    if ($list.Count -eq 1) { return $list[0].FullName }

    Title 'Hay varios paquetes .ipk. Elige el numero:'
    for ($i = 0; $i -lt $list.Count; $i++) {
        Info (('{0}) {1}  ({2:N1} MB)') -f ($i + 1), $list[$i].Name, ($list[$i].Length / 1MB))
    }
    $pick = Read-WithDefault 'Numero' '1'
    $idx = 1
    [void][int]::TryParse($pick, [ref]$idx)
    $idx = [Math]::Max(1, [Math]::Min($list.Count, $idx))
    return $list[$idx - 1].FullName
}

function Invoke-Native($exe, [string[]]$arguments, $stdinText) {
    # Si se pasa $stdinText, se envia por la entrada estandar. El ssh de Windows
    # no usa SSH_ASKPASS, pero si lee la clave de stdin cuando no es consola.
    if ($null -ne $stdinText) {
        $stdinText | & $exe @arguments
    } else {
        & $exe @arguments
    }
    $script:LastExit = $LASTEXITCODE
}

function Read-TvPassword {
    # Se lee tecla a tecla para no mostrar la clave. Si la entrada esta
    # redirigida (por ejemplo al probar el instalador desde un script), se
    # usa Read-Host, que en ese caso si funciona.
    if (-not [Console]::IsInputRedirected) {
        Write-Host '   Clave de la TV (no se ve al escribir): ' -NoNewline
        $sb = New-Object System.Text.StringBuilder
        while ($true) {
            $k = [Console]::ReadKey($true)
            if ($k.Key -eq [ConsoleKey]::Enter) { break }
            if ($k.Key -eq [ConsoleKey]::Backspace) {
                if ($sb.Length -gt 0) { [void]$sb.Remove($sb.Length - 1, 1) }
                continue
            }
            if ($k.Key -eq [ConsoleKey]::Escape) { [void]$sb.Clear(); continue }
            if ([char]::IsControl($k.KeyChar)) { continue }
            [void]$sb.Append($k.KeyChar)
        }
        Write-Host ''
        return $sb.ToString()
    }
    return (Read-Host '   Clave de la TV')
}

function Get-SavedTvPassphrase($config) {
    # ConvertFrom-SecureString sin -Key usa DPAPI. El valor solo se puede abrir
    # desde este usuario de Windows y este ordenador; nunca se guarda texto plano.
    if (-not $config -or -not $config.credential) { return '' }
    try {
        $secure = ConvertTo-SecureString -String ([string]$config.credential)
        return (New-Object System.Net.NetworkCredential('', $secure)).Password
    } catch {
        return ''
    }
}

function Save-InstallerConfig([string]$passphrase) {
    try {
        if (-not (Test-Path -LiteralPath $ConfigDir)) {
            New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
        }
        $save = [ordered]@{ host = $TvHost; user = $TvUser; port = $Port }
        if (-not $script:RootMode -and -not [string]::IsNullOrWhiteSpace($passphrase)) {
            $secure = ConvertTo-SecureString -String $passphrase -AsPlainText -Force
            $save.credential = ConvertFrom-SecureString -SecureString $secure
        }
        ([pscustomobject]$save | ConvertTo-Json) | Set-Content -LiteralPath $ConfigFile -Encoding UTF8 -ErrorAction Stop
    } catch { }
}

function Clear-SavedTvPassphrase {
    try {
        if (-not $cfg) { return }
        $save = [ordered]@{ host = $TvHost; user = $TvUser; port = $Port }
        if (-not (Test-Path -LiteralPath $ConfigDir)) {
            New-Item -ItemType Directory -Path $ConfigDir -Force | Out-Null
        }
        ([pscustomobject]$save | ConvertTo-Json) | Set-Content -LiteralPath $ConfigFile -Encoding UTF8 -ErrorAction Stop
    } catch { }
}

function Get-UserCandidates {
    # La cuenta del modo desarrollador depende del firmware: unas TV usan
    # 'prisoner' (con o, la que usa la herramienta oficial de LG) y otras
    # 'prisioner' (con i). En vez de adivinar, se prueban en orden y se
    # recuerda la que funcione en instalar-config.json.
    $lista = New-Object System.Collections.Generic.List[string]
    if ($script:UserExplicit -and $TvUser) {
        [void]$lista.Add([string]$TvUser)
        return $lista.ToArray()
    }
    foreach ($u in @($TvUser, $(if ($cfg) { [string]$cfg.user }), 'prisoner', 'prisioner')) {
        if ([string]::IsNullOrWhiteSpace($u)) { continue }
        if (-not $lista.Contains([string]$u)) { [void]$lista.Add([string]$u) }
    }
    return $lista.ToArray()
}

function Test-TvPassword([string]$pass, [string]$user = $TvUser) {
    # Prueba la clave con un comando inofensivo antes de subir 21 MB.
    # La salida se captura para no ensuciar la pantalla con errores de ssh.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $a = @('-p', "$Port") + $script:SshOpts + @(
            '-o', 'NumberOfPasswordPrompts=1',
            ($user + '@' + $TvHost), 'true'
        )
        $out = $pass | & ssh @a 2>&1 | Out-String
        $script:LastAuthError = $out
        return ($LASTEXITCODE -eq 0)
    } catch {
        $script:LastAuthError = '' + $_.Exception.Message
        return $false
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Set-KeyAcl([string]$path) {
    # ssh se niega a usar una clave que puedan leer otros usuarios del PC.
    # icacls quita la herencia y deja el archivo solo para el usuario actual.
    $me = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    & icacls $path /inheritance:r /grant:r ($me + ':(F)') 2>&1 | Out-Null
}

function Remove-TvKey {
    if ($script:KeyDir -and (Test-Path -LiteralPath $script:KeyDir)) {
        Remove-Item -LiteralPath $script:KeyDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    $script:KeyDir = ''
    $script:KeyPath = ''
    $script:UseKey = $false
}

function Get-TvKey([string]$ip, [string]$passphrase) {
    # Las TV con "KEY SERVER" activado no aceptan contrasena: publican una clave
    # privada cifrada en http://IP:9991/webos_rsa y la passphrase de Developer
    # Mode la descifra. Es exactamente lo que hace "ares-novacom --getkey".
    $script:KeyError = ''
    if (-not (Test-Port $ip 9991 4000)) {
        $script:KeyError = 'La TV no abre el puerto 9991 (KEY SERVER).'
        return ''
    }
    Remove-TvKey
    $dir = Join-Path $env:TEMP ('xuper-tvkey-' + [Guid]::NewGuid().ToString('N').Substring(0, 8))
    $path = Join-Path $dir 'webos_rsa'
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        # El servidor de la TV es lento y a veces corta: se reintenta la descarga.
        $bajada = $false
        for ($i = 1; $i -le 3; $i++) {
            try {
                Invoke-WebRequest -Uri ('http://' + $ip + ':9991/webos_rsa') -OutFile $path -UseBasicParsing -TimeoutSec 15 | Out-Null
                if ((Test-Path -LiteralPath $path) -and ((Get-Item -LiteralPath $path).Length -gt 100)) { $bajada = $true; break }
            } catch {
                $script:KeyError = 'No se pudo descargar la llave de la TV: ' + $_.Exception.Message
            }
            if ($i -lt 3) { Start-Sleep -Seconds 2 }
        }
        if (-not $bajada) {
            if (-not $script:KeyError) { $script:KeyError = 'La TV no entrego su llave de seguridad.' }
            return ''
        }
        $head = ((Get-Content -LiteralPath $path -TotalCount 2) -join ' ')
        if ($head -notmatch 'PRIVATE KEY') {
            $script:KeyError = 'Lo que publica la TV no es una llave valida.'
            return ''
        }
        Set-KeyAcl $path
        $script:KeyDir = $dir
        if ($head -match 'ENCRYPTED') {
            # ssh-keygen descifra el PEM sin abrir ningun prompt (por eso no se
            # cuelga como pasaba al pasar la clave cifrada a ssh -i).
            & ssh-keygen -p -m PEM -P $passphrase -N '""' -f $path 2>&1 | Out-Null
            if ($LASTEXITCODE -ne 0) {
                $script:KeyError = 'La clave no abre la llave de la TV (passphrase incorrecta).'
                return ''
            }
        }
        $pub = (& ssh-keygen -y -f $path 2>&1 | Out-String)
        if ($pub -notmatch '^ssh-(rsa|ed25519)') {
            $script:KeyError = 'La llave de la TV no se pudo leer despues de descifrarla.'
            return ''
        }
        $script:KeyIsRsa = ($pub -match '^ssh-rsa')
        return $path
    } catch {
        $script:KeyError = 'Error preparando la llave de la TV: ' + $_.Exception.Message
        return ''
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Test-KeyAuth([string]$keyPath, [string]$user = $TvUser) {
    # Comprueba que la TV acepta esa clave, sin pedir nada por consola.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $a = @('-i', $keyPath, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
            '-o', 'NumberOfPasswordPrompts=0', '-p', "$Port") + (Get-KeyAlgOpts) + $script:SshOpts + @(
            ($user + '@' + $TvHost), 'true')
        $out = & ssh @a 2>&1 | Out-String
        $script:LastAuthError = $out
        return ($LASTEXITCODE -eq 0)
    } catch {
        $script:LastAuthError = '' + $_.Exception.Message
        return $false
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Get-KeyAlgOpts {
    # OpenSSH 9.5 ofrece primero rsa-sha2-512/256; el sshd 6.1 de webOS solo
    # conoce ssh-rsa, y con varias ofertas agota MaxAuthTries. Se fija ssh-rsa
    # como UNICO algoritmo de firma para esta conexion.
    # El nombre de la opcion depende de la version: Windows 10 20H2 (8.1) usa
    # PubkeyAcceptedKeyTypes y rechaza PubkeyAcceptedAlgorithms.
    if ($script:KeyIsRsa) {
        $name = Get-PubkeyAlgName
        if ($name) { return @('-o', ($name + '=ssh-rsa')) }
    }
    return @()
}

function Get-KeyAuthDebug([string]$keyPath, [string]$user = $TvUser) {
    # Si la llave se descifra pero la TV no la autoriza, esto dice por que.
    # Guarda la salida completa en un archivo para poder enviarla.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $a = @('-vvv', '-i', $keyPath, '-o', 'IdentitiesOnly=yes', '-o', 'BatchMode=yes',
            '-o', 'NumberOfPasswordPrompts=0', '-p', "$Port") + (Get-KeyAlgOpts) + $script:SshOpts + @(
            ($user + '@' + $TvHost), 'true')
        $out = & ssh @a 2>&1 | Out-String
        $logPath = Join-Path $env:TEMP 'diagnostico-xupertv.txt'
        try {
            $sshVer = ([regex]::Match(((& ssh -V 2>&1) | Out-String), 'OpenSSH[_A-Za-z0-9.]+')).Value
            $head = 'XuperTV - diagnostico de la llave de seguridad' + "`r`n" +
                ('TV      : ' + $user + '@' + $TvHost + ':' + $Port) + "`r`n" +
                ('Fecha   : ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')) + "`r`n" +
                ('Huella  : ' + (((& ssh-keygen -lf $keyPath 2>&1) | Out-String).Trim())) + "`r`n" +
                ('Version : ' + $sshVer) + "`r`n`r`n"
            [System.IO.File]::WriteAllText($logPath, $head + $out, (New-Object System.Text.UTF8Encoding($false)))
            $script:DiagLog = $logPath
        } catch {
            $script:DiagLog = ''
        }
        $lines = ($out -split "`r?`n") | Where-Object {
            $_ -match 'Offering public key|Server accepts key|Authentications that can continue|Next authentication|sign_and_send_pubkey|send_pubkey_test|Permission denied|Too many authentication|no mutual signature|Load key|Will attempt|Connection closed|Connection reset'
        }
        return (($lines | ForEach-Object { '           ' + $_.Trim() }) -join "`n")
    } catch {
        return ''
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Get-AuthArgs {
    # Con clave: -i y BatchMode (asi ssh nunca se queda esperando una tecla).
    if ($script:UseKey -and $script:KeyPath) {
        return @('-i', $script:KeyPath, '-o', 'IdentitiesOnly=yes',
            '-o', 'BatchMode=yes', '-o', 'NumberOfPasswordPrompts=0') + (Get-KeyAlgOpts)
    }
    return @()
}

function Send-FileToTv([string]$localPath, [string]$remotePath, [string]$pass) {
    # Las TV webOS no traen "scp" ni "sftp-server" en el PATH: el scp antiguo
    # (-O) falla con "sh: scp: not found". Lo que si existe es el subsistema
    # sftp del sshd del modo desarrollador, asi que se usa sftp.
    $script:LastTransferError = ''
    $batch = Join-Path $env:TEMP ('xuper-sftp-' + [Guid]::NewGuid().ToString('N').Substring(0, 6) + '.txt')
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $lines = @(('put "' + $localPath + '" "' + $remotePath + '"'), 'quit')
        [System.IO.File]::WriteAllLines($batch, $lines, (New-Object System.Text.UTF8Encoding($false)))
        $target = $TvUser + '@' + $TvHost
        $a = @('-P', "$Port") + $script:SshOpts + (Get-AuthArgs) + @('-b', $batch, $target)
        $out = & sftp @a 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0) { return $true }
        $script:LastTransferError = $out

        # Plan B: scp en modo antiguo (por si esa TV si trae scp).
        $scpArgs = @('-P', "$Port")
        if ($script:ScpLegacy) { $scpArgs = @('-O') + $scpArgs }
        $scpArgs = $scpArgs + $script:SshOpts + (Get-AuthArgs) + @($localPath, ($target + ':' + $remotePath))
        if ($pass -and -not $script:UseKey) { $pass | & scp @scpArgs 2>&1 | Out-Null } else { & scp @scpArgs 2>&1 | Out-Null }
        if ($LASTEXITCODE -eq 0) { return $true }
        return $false
    } catch {
        $script:LastTransferError = '' + $_.Exception.Message
        return $false
    } finally {
        Remove-Item -LiteralPath $batch -Force -ErrorAction SilentlyContinue
        $ErrorActionPreference = $prev
    }
}

function Get-SshDiagnosis {
    # BatchMode nunca pide contrasena, asi que se puede capturar la salida sin
    # riesgo de esconder el prompt. Sirve para distinguir red de autenticacion.
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $a = @('-p', "$Port") + $script:SshOpts + @(
            '-o', 'BatchMode=yes', '-o', 'NumberOfPasswordPrompts=0',
            '-o', 'ConnectTimeout=8', "$TvUser@$TvHost", 'true'
        )
        $out = & ssh @a 2>&1 | ForEach-Object { '' + $_ }
        return ($out -join "`n")
    } catch {
        return ''
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Explain-SshError($text) {
    $t = '' + $text
    if ($t -match 'Permission denied|Authentication failed|Too many authentication') {
        Fail 'La contrasena no es correcta, o el Modo Desarrollador ha caducado.'
        Info 'Abre la app "Developer Mode" en la TV y mira la clave que muestra ahora.'
        return
    }
    if ($t -match 'timed out|No route to host|Connection refused|Network is unreachable|Could not resolve') {
        Fail 'No consigo hablar con el televisor.'
        Info 'Comprueba que la TV esta encendida, en la MISMA red WiFi que este PC'
        Info 'y que la IP es la que muestra la app Developer Mode.'
        return
    }
    if ($t -match 'Host key verification failed') {
        Fail 'La TV cambio su huella de seguridad.'
        Info 'Borra su linea en: ' + (Join-Path $env:USERPROFILE '.ssh\known_hosts')
        return
    }
    Fail 'No se pudo completar la conexion con el televisor.'
    Info 'Reinicia la TV, vuelve a activar el Modo Desarrollador y repite.'
}

function Get-IpkVersion($path) {
    # Lee la version real del IPK (data.tar.gz -> appinfo.json).
    $tmpDir = Join-Path $env:TEMP ('xuper-ipk-' + [Guid]::NewGuid().ToString('N').Substring(0, 8))
    try {
        New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
        & tar -xf $path -C $tmpDir 'data.tar.gz' 2>$null
        $dataTar = Join-Path $tmpDir 'data.tar.gz'
        if (-not (Test-Path -LiteralPath $dataTar)) { return '' }
        $txt = (& tar -xzOf $dataTar "usr/palm/applications/$AppId/appinfo.json" 2>$null) -join "`n"
        $m = [regex]::Match($txt, '"version"\s*:\s*"([^"]+)"')
        if ($m.Success) { return $m.Groups[1].Value }
        return ''
    } catch {
        return ''
    } finally {
        # The archive extractor can remove/never create its staging folder on
        # some Windows builds. Cleanup is optional and must never abort an
        # otherwise valid TV installation.
        if ($tmpDir -and (Test-Path -LiteralPath $tmpDir -PathType Container)) {
            try {
                Remove-Item -LiteralPath $tmpDir -Recurse -Force -ErrorAction Stop
            } catch {
                # Temp cleanup failure is harmless; Windows clears it later.
            }
        }
    }
}

# ---------------------------------------------------------------- programa
Show-Banner

# ---------------------------------------------------------- 1. requisitos
Step '1/6' 'Comprobando este ordenador'
$sshCmd = Get-Command ssh -ErrorAction SilentlyContinue
$scpCmd = Get-Command scp -ErrorAction SilentlyContinue
if (-not $sshCmd -or -not $scpCmd) {
    Fail 'Windows no tiene el cliente SSH instalado.'
    Info 'Ve a Configuracion > Aplicaciones > Caracteristicas opcionales'
    Info 'y anade "Cliente OpenSSH". Despues vuelve a ejecutar este instalador.'
    Pause-End
    exit 1
}
Ok 'Cliente SSH disponible'

# ---------------------------------------------------------- 2. el paquete
Step '2/6' 'Buscando el paquete de la aplicacion (.ipk)'
if ($Diagnose) {
    # El diagnostico no instala nada: no hace falta el .ipk.
    $ipkPath = ''
    $ipkItem = $null
    Info 'Modo diagnostico: no se instala nada.'
} else {
try {
    $ipkPath = Get-IpkCandidate -explicit $Ipk
} catch {
    Fail $_.Exception.Message
    Pause-End
    exit 1
}
if (-not $ipkPath) {
    Fail 'No encuentro ningun archivo .ipk.'
    Info 'El .ipk tiene que estar EN LA MISMA CARPETA que este instalador.'
    Info 'Si lo estas abriendo desde dentro del ZIP, primero extrae la carpeta.'
    $manual = Read-WithDefault 'Escribe la ruta completa del .ipk' ''
    if ($manual -and (Test-Path -LiteralPath $manual)) {
        $ipkPath = (Resolve-Path -LiteralPath $manual).Path
    } else {
        Pause-End
        exit 1
    }
}
$ipkItem = Get-Item -LiteralPath $ipkPath
Ok ($ipkItem.Name + '  (' + ('{0:N1}' -f ($ipkItem.Length / 1MB)) + ' MB)')
}

# ---------------------------------------------------------- 3. la TV
$cfg = $null
$configToRead = if (Test-Path -LiteralPath $ConfigFile) { $ConfigFile } elseif (Test-Path -LiteralPath $LegacyConfigFile) { $LegacyConfigFile } else { '' }
if ($configToRead) {
    try { $cfg = Get-Content -LiteralPath $configToRead -Raw | ConvertFrom-Json } catch { $cfg = $null }
}

Step '3/6' 'Datos del televisor'
Info 'La IP y la clave las muestra la app "Developer Mode" en la pantalla de la TV.'
Info 'Al activar el modo la TV se reinicia, y entonces la IP PUEDE CAMBIAR.'
$locals = @(Get-LocalIPv4)
if ($locals.Count -gt 0) {
    Info ('Este ordenador esta en: ' + (($locals | ForEach-Object { $_.IP }) -join ', '))
}
$detectedPort = 0

if (-not $TvHost) {
    $def = ''
    if ($cfg -and $cfg.host) { $def = [string]$cfg.host }
    if ($def) { Info ('La ultima vez funciono con ' + $def + '. Pulsa Enter para repetirla.') }
    $intentos = 0
    while (-not $TvHost) {
        $v = Read-WithDefault 'IP del televisor (o B para buscarla)' $def
        if ([string]::IsNullOrWhiteSpace($v) -or $v -match '^(?i)(b|buscar|busca)$') {
            # Enter en blanco = "no se cual es": la busco yo.
            $intentos = $intentos + 1
            if ($intentos -gt 2) {
                Fail 'No consigo dar con la IP del televisor.'
                Info 'Mira la app "Developer Mode" en la TV y escribe la IP a mano.'
                Pause-End
                exit 1
            }
            $hit = Select-TvFromScan $locals
            if ($hit) { $TvHost = $hit.IP; $detectedPort = [int]$hit.Port }
            continue
        }
        if (-not (Test-Host $v)) {
            Fail 'Eso no parece una IP. Ejemplo: 192.168.1.50'
            Info 'Si no sabes cual es, escribe B y la busco yo en tu red.'
            continue
        }
        $TvHost = $v
    }
}

if (-not $TvUser) {
    Info 'Tipo de TV:  1) Modo Desarrollador (lo normal)   2) TV con root'
    $choice = Read-WithDefault 'Elige 1 o 2' '1'
    if ($choice -eq '2') {
        $TvUser = 'root'
        $script:UserExplicit = $true
        $script:RootMode = $true
    }
    # En Modo Desarrollador el nombre de la cuenta cambia segun el firmware
    # ('prisoner' o 'prisioner'): se deja vacio y se prueban los dos al entrar.
}

# Si la TV esta en otra red que el PC, no se van a ver nunca: avisar claro.
if ((Test-IPv4 $TvHost) -and $locals.Count -gt 0) {
    if (-not (Test-SameLan $TvHost $locals)) {
        Warn ('La TV (' + $TvHost + ') no esta en la misma red que este PC (' + (($locals | ForEach-Object { $_.IP }) -join ', ') + ').')
        Info 'Con la TV y el PC en redes distintas no hay forma de conectarlos.'
        Info 'Conecta los dos al mismo router/WiFi y repite (ojo con el WiFi de invitados).'
        $go = Read-WithDefault 'Continuar de todas formas? (s/n)' 'n'
        if ($go -notmatch '^[sS]') { Pause-End; exit 1 }
    }
}

# ---------------------------------------------------------- 4. conexion
Step '4/6' 'Comprobando la conexion'

# Puerto: Developer Mode usa 9922; Homebrew/root expone SSH en 22.  Se da
# prioridad al puerto propio del modo elegido para no autenticar root contra
# el servidor temporal de Developer Mode.
if ($Port -le 0) {
    $candidatos = @()
    if ($script:RootMode) {
        $candidatos += 22
        if ($detectedPort -gt 0) { $candidatos += $detectedPort }
        if ($cfg -and $cfg.port) { $candidatos += [int]$cfg.port }
        $candidatos += 9922
    } else {
        # Developer Mode siempre es prisoner@9922. No permitimos que un
        # puerto 22 guardado de una instalacion anterior gane esta prioridad.
        $candidatos += 9922
        if ($detectedPort -gt 0) { $candidatos += $detectedPort }
        if ($cfg -and $cfg.port) { $candidatos += [int]$cfg.port }
        $candidatos += 22
    }
    $candidatos = @($candidatos | Where-Object { $_ -gt 0 } | Select-Object -Unique)
    if ($DryRun) {
        $Port = $candidatos[0]
        Info ('Puerto: ' + $Port + ' (o el 22; se detecta al conectar)')
    } else {
        $Port = Find-SshPort $TvHost $candidatos 2500
        if ($Port -eq 0) {
            $Port = $candidatos[0]
            Warn ('El SSH de la TV no responde en el puerto ' + $Port + '.')
        } else {
            Ok ('El SSH de la TV escucha en el puerto ' + $Port)
        }
    }
}

if ($DryRun) {
    Info 'Modo de prueba: no se comprueba la red.'
} else {
    while ($true) {
        if (Test-Port $TvHost $Port 3000) { Ok 'El televisor responde'; break }

        Warn ('El televisor no responde en ' + $TvHost + ':' + $Port + '.')
        Info 'Suele ser una de tres cosas: la TV esta apagada, la IP ha cambiado,'
        Info 'o la TV y el PC estan en redes distintas.'
        if ($locals.Count -gt 0) {
            Info ('Este PC esta en: ' + (($locals | ForEach-Object { $_.IP }) -join ', '))
        }

        # Antes de preguntar, probar el otro puerto habitual de LG.
        $cambiado = $false
        foreach ($otro in @(9922, 22)) {
            if ($otro -ne $Port -and (Test-Port $TvHost $otro 1500)) {
                Ok ('Pero responde en el puerto ' + $otro + ': uso ese.')
                $Port = $otro
                $cambiado = $true
                break
            }
        }
        if ($cambiado) { continue }

        Title 'Que quieres hacer?'
        Info '1) Escribir otra IP'
        Info '2) Buscar la TV en la red (recomendado)'
        Info '3) Salir'
        $pick = Read-WithDefault 'Elige 1, 2 o 3' '2'
        if ($pick -eq '3') { Pause-End; exit 1 }
        if ($pick -eq '1') {
            $nueva = Read-WithDefault 'IP del televisor' ''
            if (Test-Host $nueva) {
                $TvHost = $nueva
                $Port = Find-SshPort $TvHost @(9922, 22) 2000
                if ($Port -eq 0) { $Port = 9922 }
            } else {
                Fail 'Eso no parece una IP.'
            }
            continue
        }
        $hit = Select-TvFromScan $locals
        if ($hit) { $TvHost = $hit.IP; $Port = [int]$hit.Port }
    }
}

$userLabel = $TvUser
if (-not $userLabel) { $userLabel = 'se detecta al conectar' }
Ok ('TV: ' + $TvHost + ':' + $Port + '  usuario: ' + $userLabel)

$script:SshOpts = @(Get-SshOpts)
$script:ScpLegacy = Test-ScpLegacy

$remoteDir = '/media/developer/temp'
$remoteIpk = if ($ipkItem) { "$remoteDir/" + $ipkItem.Name } else { '' }
$expected = if ($ipkPath) { Get-IpkVersion $ipkPath } else { '' }
if (-not $expected) { $expected = 'desconocida' }

if ($DryRun) {
    Title 'DRY RUN (no se toca la TV)'
    Info ('IPK     : ' + $ipkPath)
    Info ('Version : ' + $expected)
    Info ('TV      : ' + $TvUser + '@' + $TvHost + ':' + $Port)
    Info ('Destino : ' + $remoteIpk)
    Pause-End
    exit 0
}

# ---------------------------------------------------------- 5. copiar
Step '5/6' 'Copiando la aplicacion al televisor'
if ($script:RootMode) {
    Info 'Escribe la contraseña SSH de Homebrew Channel.'
    Info 'Si nunca la cambiaste, normalmente es: alpine'
} else {
    Info 'Escribe la clave que muestra la app "Developer Mode" en la TV.'
    Info 'Después de verificarla se recordará cifrada solo en este PC.'
}
Info 'No se ve nada mientras escribes: es normal.'
Write-Host ''

$tvPass = ''
$savedTvPass = if ($script:RootMode) { '' } else { Get-SavedTvPassphrase $cfg }
$usingSavedPass = $false
$intentosPass = 0
while (-not $tvPass) {
    $intentosPass = $intentosPass + 1
    if ($intentosPass -gt 3) {
        Fail 'La TV no acepta ninguna de las claves escritas.'
        if ($script:RootMode) {
            Info 'Comprueba que SSH Server este activado en Homebrew Channel.'
            Info 'Usa la contraseña SSH configurada alli (por defecto: alpine).'
        } else {
            Info 'Abre la app "Developer Mode" en la TV y mira la clave de ahora.'
            Info 'Si pone KEY SERVER en ON, esa misma clave desbloquea la llave de la TV.'
            Info 'Si la sesion esta caducada, renovadla (dura 50 horas) y repite.'
        }
        Pause-End
        exit 1
    }
    $usingSavedPass = $false
    if ($savedTvPass) {
        $tvPass = $savedTvPass
        $savedTvPass = ''
        $usingSavedPass = $true
        Info 'Usando la clave cifrada guardada en este PC...'
    } else {
        $tvPass = Read-TvPassword
    }
    if ($tvPass) { $tvPass = $tvPass.Trim() }
    if ([string]::IsNullOrEmpty($tvPass)) {
        Fail 'La clave no puede estar vacia.'
        $tvPass = ''
        continue
    }
    Info 'Comprobando la clave con la TV...'
    $usuarios = @(Get-UserCandidates)
    $authOk = $false

    foreach ($u in $usuarios) {
        if (Test-TvPassword $tvPass $u) {
            $TvUser = $u
            $script:UseKey = $false
            $authOk = $true
            Ok ('La TV acepta la clave (usuario ' + $u + ')')
            break
        }
    }

    if (-not $authOk -and -not $script:RootMode) {
        # Con "KEY SERVER" activado la TV no admite contrasena: la passphrase
        # sirve para descifrar la llave que la TV publica en el puerto 9991.
        # Tras un reinicio la web del Key Server puede entregar una llave
        # anterior durante unos segundos. Se baja una llave NUEVA en cada
        # intento; reintentar el mismo archivo no arregla esa desincronizacion.
        Info 'No la acepta como contrasena. Probando la llave de seguridad...'
        $keyPath = ''
        for ($keyRound = 1; $keyRound -le 3 -and -not $authOk; $keyRound++) {
            if ($keyRound -gt 1) {
                Info ('La TV aun sincroniza su llave. Solicito una nueva (' + $keyRound + '/3)...')
                Start-Sleep -Seconds 4
            }
            $keyPath = Get-TvKey $TvHost $tvPass
            if ($keyPath) {
                foreach ($u in $usuarios) {
                    if (Test-KeyAuth $keyPath $u) { $authOk = $true; break }
                }
                if ($authOk) {
                    $TvUser = $u
                    $script:KeyPath = $keyPath
                    $script:UseKey = $true
                    Ok ('La TV acepta la llave de seguridad (KEY SERVER, usuario ' + $u + ')')
                    break
                }
            }
        }
        if (-not $authOk -and $keyPath) {
            # Si la llave se descifro, la passphrase es correcta: pedirla otra
            # vez no arregla nada. El problema esta en la sesion de la TV.
            Fail 'La clave es correcta, pero la TV rechazo tres llaves nuevas.'
            Info ('Cuentas probadas: ' + ($usuarios -join ', '))
            if ($script:LastAuthError) {
                $primera = (($script:LastAuthError -split "`r?`n") | Where-Object { $_ -match 'denied|refused|reset|closed|Too many' } | Select-Object -First 1)
                if ($primera) { Info ('La TV respondio: ' + $primera.Trim()) }
            }
            $dbg = Get-KeyAuthDebug $keyPath $usuarios[-1]
            if ($dbg) {
                Info 'Detalle tecnico:'
                Write-Host $dbg -ForegroundColor DarkGray
            }
            if ($script:DiagLog) {
                Info ('Diagnostico guardado en: ' + $script:DiagLog)
                Info 'Envia ese archivo si necesitas ayuda.'
            }
            Pause-End
            exit 1
        }
        elseif ($script:KeyError) {
            Warn ('No se pudo usar la llave de la TV: ' + $script:KeyError)
        }
    }

    if (-not $authOk) {
        Fail 'La TV ha rechazado esa clave.'
        if ($usingSavedPass) {
            Warn 'La clave guardada ya no sirve. Se eliminó y se pedirá una nueva.'
            Clear-SavedTvPassphrase
        }
        if ($script:RootMode) {
            Info 'Comprueba SSH Server en Homebrew Channel y la contraseña root.'
        } else {
            Info 'Escribela otra vez con cuidado: no se ve al escribir.'
        }
        if (-not $script:RootMode -and $intentosPass -ge 2) {
            Info 'Tiene que ser la que muestra la app Developer Mode, tal cual.'
        }
        $tvPass = ''
    }
}
Write-Host ''

$authArgs = @(Get-AuthArgs)

if ($Diagnose) {
    Step 'DIAG' 'Leyendo por SSH por que el servicio no arranca (no instala nada)'
    $diagSh = @'
APPID=com.webosflux.xuptertv.fidelity
SVCID=com.webosflux.xuptertv.fidelity.service
echo "=== SISTEMA ==="
uname -a 2>&1
echo "--- node ---"
which node 2>/dev/null || echo "sin node en PATH"
node -v 2>&1
echo
echo "=== APP INSTALADA ==="
for d in /media/developer/apps/usr/palm/applications/$APPID /media/cryptofs/apps/usr/palm/applications/$APPID /usr/palm/applications/$APPID; do
  if [ -d "$d" ]; then
    echo "DIR $d"
    grep -o '"version"[^,]*' "$d/appinfo.json" 2>/dev/null
  fi
done
echo
echo "=== SERVICIO INSTALADO ==="
SVC=""
for d in /media/developer/apps/usr/palm/services/$SVCID /media/cryptofs/apps/usr/palm/services/$SVCID /usr/palm/services/$SVCID; do
  if [ -d "$d" ]; then
    echo "DIR $d"
    SVC="$d"
    ls -l "$d" 2>&1
  fi
done
[ -z "$SVC" ] && echo "NO ENCONTRADO el directorio del servicio"
echo
echo "=== PROCESO DEL SERVICIO ==="
ps -ef 2>/dev/null | grep -i "fidelity.service" | grep -v grep || echo "no hay proceso del servicio"
echo
echo "=== LUNA: PING ==="
for LS in luna-send luna-send-pub /usr/bin/luna-send /usr/sbin/luna-send; do
  if command -v "$LS" >/dev/null 2>&1; then
    echo "probando $LS"
    "$LS" -n 1 -f luna://$SVCID/ping '{}' 2>&1 | head -c 400
    echo
  fi
done
echo
echo "=== API LOCAL HTTP (respaldo) ==="
if command -v wget >/dev/null 2>&1; then
  wget -q -O - "http://127.0.0.1:8910/ping" 2>&1 | head -c 400
else
  echo "sin wget en la TV"
fi
echo
echo
echo "=== SINTAXIS DE LOS MODULOS (Node de la TV) ==="
if [ -n "$SVC" ]; then
  cd "$SVC" || exit 0
  for f in *.js; do
    if node -e "new Function(require('fs').readFileSync('$f','utf8'));" >/dev/null 2>&1; then
      echo "OK   $f"
    else
      echo "FALLA $f"
      node -e "new Function(require('fs').readFileSync('$f','utf8'));" 2>&1 | head -n 4
    fi
  done
  echo "--- carga de modulos ---"
  if timeout -t 1 true >/dev/null 2>&1; then TO="timeout -t 10"; else TO="timeout 10"; fi
  $TO node -e "require('./magis');require('./proxy');require('./dnsx');require('./netdiag');require('./upstream');console.log('MODULOS OK')" 2>&1 | head -n 20
  echo "--- permisos ffmpeg ---"
  ls -l ffmpeg 2>&1
fi
echo
echo "=== LOGS ==="
for f in /var/log/luna-service2.log /var/log/messages /tmp/xuper-relay.log; do
  if [ -f "$f" ]; then
    echo "--- $f ---"
    tail -n 400 "$f" 2>/dev/null | grep -i -E "xupter|fidelity|denied|unknown method|syntaxerror|no se pudo cargar" | tail -n 40
  fi
done
echo "--- logread ---"
logread 2>/dev/null | tail -n 400 | grep -i -E "xupter|fidelity|denied|unknown method|syntaxerror" | tail -n 40
echo
echo "=== FIN ==="
'@
    $diagSh = $diagSh -replace "`r`n", "`n"
    $localSh = Join-Path $env:TEMP 'xuper-diag.sh'
    [System.IO.File]::WriteAllText($localSh, $diagSh, (New-Object System.Text.UTF8Encoding($false)))
    $remoteSh = '/tmp/xuper-diag.sh'
    if (Send-FileToTv $localSh $remoteSh $tvPass) {
        $runArgs = @('-p', "$Port") + $script:SshOpts + $authArgs + @(($TvUser + '@' + $TvHost), ('sh ' + $remoteSh))
        $prev = $ErrorActionPreference
        $ErrorActionPreference = 'Continue'
        if ($script:UseKey) { $out = (& ssh @runArgs 2>&1 | Out-String) } else { $out = ($tvPass | & ssh @runArgs 2>&1 | Out-String) }
        $ErrorActionPreference = $prev
        $outFile = Join-Path $PSScriptRoot 'diagnostico-xupertv-tv.txt'
        $out | Set-Content -LiteralPath $outFile -Encoding UTF8
        Write-Host ''
        Write-Host $out
        Write-Host ''
        Ok ('Diagnostico guardado en ' + $outFile)
    } else {
        Fail 'No pude copiar el diagnostico a la TV.'
        if ($script:LastTransferError) { Info (($script:LastTransferError -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -Last 2) -join ' ') }
    }
    Pause-End
    exit 0
}

# Liberar espacio en la particion de desarrollo borrando paquetes e instaladores temporales viejos
$cleanArgs = @('-p', "$Port") + $script:SshOpts + $authArgs + @(($TvUser + '@' + $TvHost), 'rm -f /media/developer/temp/*.ipk /media/developer/temp/*.log /media/developer/temp/*.json /tmp/*.ipk 2>/dev/null')
if ($script:UseKey) { Invoke-Native 'ssh' $cleanArgs } else { Invoke-Native 'ssh' $cleanArgs $tvPass }

if (-not (Send-FileToTv $ipkPath $remoteIpk $tvPass)) {
    $diag = Get-SshDiagnosis
    if ($diag -match 'timed out|No route to host|Connection refused|Network is unreachable|Could not resolve') {
        Explain-SshError $diag
        Pause-End
        exit 1
    }
    Warn 'No pude escribir en /media/developer/temp. Pruebo en /tmp...'
    $remoteDir = '/tmp'
    $remoteIpk = "$remoteDir/" + $ipkItem.Name
    if (-not (Send-FileToTv $ipkPath $remoteIpk $tvPass)) {
        Fail 'No pude copiar la aplicacion al televisor.'
        if ($script:LastTransferError) {
            $linea = (($script:LastTransferError -split "`r?`n") | Where-Object { $_.Trim() } | Select-Object -Last 2) -join ' '
            if ($linea) { Info ('La TV respondio: ' + $linea.Trim()) }
        }
        Explain-SshError (Get-SshDiagnosis)
        Pause-End
        exit 1
    }
}
Ok 'Paquete copiado'

# ---------------------------------------------------------- 6. instalar
Step '6/6' 'Instalando en el televisor'
Info 'No cierres esta ventana. Puede tardar entre 30 segundos y 2 minutos.'
Write-Host ''

Info ('Version que se va a instalar: ' + $expected)

$installJson    = '{"id":"' + $AppId + '","ipkUrl":"' + $remoteIpk + '","subscribe":true}'
$launchJson     = '{"id":"' + $AppId + '"}'
$installJsonPath = $remoteDir + '/xuper-install.json'
$launchJsonPath  = $remoteDir + '/xuper-launch.json'
$remoteShPath    = $remoteDir + '/xuper-instalar.sh'

$remoteScript = @'
#!/bin/sh
APP="@@APPDIR@@"
SVC="@@SVCDIR@@"
EXPECT="@@VERSION@@"
JSON="@@JSON@@"
APPID="@@APPID@@"
# En Developer Mode el usuario prisoner puede ejecutar la instalacion, pero
# algunas TVs montan /tmp como solo lectura para ese usuario. El JSON vive en
# /media/developer/temp, que es la carpeta que acabamos de escribir por SFTP;
# deja el log junto a ese archivo en vez de abortar antes de instalar.
LOG="${JSON}.log"

echo ""
echo "   >> Cerrando instancia previa si esta abierta..."
luna-send-pub -n 1 -f luna://com.webos.applicationManager/closeByAppId "{\"id\":\"$APPID\"}" >/dev/null 2>&1
echo "   >> La TV esta instalando el paquete..."
rm -f "$LOG" 2>/dev/null
luna-send-pub -i -f luna://com.webos.appInstallService/dev/install "$(cat $JSON)" > "$LOG" 2>&1 &
PID=$!

i=0
INSTALLED=""
while [ $i -lt 35 ]; do
  if grep -qiE '"state"[[:space:]]*:[[:space:]]*"failed"|"reason"[[:space:]]*:|"FAILED"|"errorCode"[[:space:]]*:|errorText' "$LOG" 2>/dev/null; then
    break
  fi
  V=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$APP/appinfo.json" 2>/dev/null | head -n 1)
  if [ "$V" = "$EXPECT" ]; then
    INSTALLED=1
    break
  fi
  if grep -qiE '"state"[[:space:]]*:[[:space:]]*"installed"' "$LOG" 2>/dev/null; then
    INSTALLED=1
    break
  fi
  printf "."
  sleep 2
  i=$((i + 1))
done
printf "\n"
sleep 2
kill $PID 2>/dev/null
sync 2>/dev/null

V=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$APP/appinfo.json" 2>/dev/null | head -n 1)

if [ "$V" != "$EXPECT" ] && [ -z "$INSTALLED" ]; then
  if grep -qiE '"downgrade"[[:space:]]*:[[:space:]]*true|"FAILED_IPKG_INSTALL"' "$LOG" 2>/dev/null; then
    echo "   >> Conflicto con version previa o falta de espacio en disco."
    echo "   >> Desinstalando version previa y liberando espacio..."
    luna-send-pub -n 1 -f luna://com.webos.appInstallService/dev/remove "{\"id\":\"$APPID\"}" >/dev/null 2>&1
    rm -f /media/developer/temp/*.ipk /tmp/*.ipk "$LOG" 2>/dev/null
    sleep 3
    echo "   >> Reintentando instalacion limpia..."
    luna-send-pub -i -f luna://com.webos.appInstallService/dev/install "$(cat $JSON)" > "$LOG" 2>&1 &
    PID=$!
    i=0
    while [ $i -lt 35 ]; do
      V=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$APP/appinfo.json" 2>/dev/null | head -n 1)
      if [ "$V" = "$EXPECT" ]; then INSTALLED=1; break; fi
      if grep -qiE '"state"[[:space:]]*:[[:space:]]*"installed"' "$LOG" 2>/dev/null; then INSTALLED=1; break; fi
      if grep -qiE '"state"[[:space:]]*:[[:space:]]*"failed"|"FAILED"' "$LOG" 2>/dev/null; then break; fi
      printf "."
      sleep 2
      i=$((i + 1))
    done
    printf "\n"
    sleep 2
    kill $PID 2>/dev/null
    sync 2>/dev/null
    V=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$APP/appinfo.json" 2>/dev/null | head -n 1)
  fi
fi

if [ "$V" != "$EXPECT" ] && [ -z "$INSTALLED" ]; then
  echo "   >> La TV no confirmo la instalacion (encontrada: ${V:-ninguna})"
  echo "   ---- respuesta del televisor ----"
  tail -n 12 "$LOG" 2>/dev/null | sed 's/^/      /'
  echo "   --------------------------------"
  exit 3
fi

echo "   >> Instalada la version ${V:-$EXPECT}"

chmod -R a+rx "/media/developer/apps/usr/palm/services" 2>/dev/null
chmod -R a+rx "$SVC" 2>/dev/null
chmod 755 "$SVC/ffmpeg" 2>/dev/null

PERMS=$(ls -l "$SVC/ffmpeg" 2>/dev/null | cut -c1-10)
if [ -n "$PERMS" ]; then
  echo "   >> ffmpeg en la TV: $PERMS"
else
  FOUND_FFMPEG=$(find /media/developer/apps /media/cryptofs/apps -name "ffmpeg" 2>/dev/null | head -n 1)
  if [ -n "$FOUND_FFMPEG" ]; then
    chmod 755 "$FOUND_FFMPEG" 2>/dev/null
    PERMS=$(ls -l "$FOUND_FFMPEG" 2>/dev/null | cut -c1-10)
    echo "   >> ffmpeg en la TV ($FOUND_FFMPEG): ${PERMS:-encontrado}"
  else
    echo "   >> ffmpeg en la TV: verificado en paquete"
  fi
fi

if [ -f "$SVC/index.js" ] && [ -f "$SVC/services.json" ]; then
  echo "   >> Servicio XuperTV verificado en disco"
fi

/usr/sbin/ls-control scan-services >/dev/null 2>&1 || ls-control scan-services >/dev/null 2>&1
sleep 2

# Comprobar si el servicio responde a ping
i=0
PING=""
while [ $i -lt 10 ]; do
  PING=$(luna-send-pub -n 1 -f "luna://@@SVCID@@/ping" '{}' 2>&1)
  case "$PING" in
    *'"returnValue":true'*) break ;;
  esac
  PING=$(luna-send-pub -n 1 -f "palm://@@SVCID@@/ping" '{}' 2>&1)
  case "$PING" in
    *'"returnValue":true'*) break ;;
  esac
  i=$((i + 1))
  sleep 1
done
case "$PING" in
  *'"returnValue":true'*)
    VER=$(echo "$PING" | sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
    echo "   >> Servicio activo (version ${VER:-?})"
    ;;
  *Denied*|*denied*|*Permission*|*permission*)
    echo "   >> Servicio instalado y registrado."
    ;;
  *)
    echo "   >> Servicio instalado."
    ;;
esac

echo "   >> Abriendo XuperTV en el televisor..."
luna-send-pub -n 1 -f luna://com.webos.applicationManager/launch "$(cat @@LAUNCH@@)" > /dev/null 2>&1
rm -f "$JSON" "$LOG" /media/developer/temp/*.ipk /media/developer/temp/*.json /media/developer/temp/*.log /tmp/*.ipk 2>/dev/null
exit 0
'@

$remoteScript = $remoteScript.Replace('@@APPDIR@@', $AppDir).Replace('@@SVCDIR@@', $SvcDir).Replace('@@SVCID@@', $SvcId).Replace('@@VERSION@@', $expected).Replace('@@JSON@@', $installJsonPath).Replace('@@APPID@@', $AppId).Replace('@@LAUNCH@@', $launchJsonPath)
$remoteScript = $remoteScript -replace "`r`n", "`n"

$tmp = Join-Path $env:TEMP ('xuper-inst-' + [Guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null
$localSh     = Join-Path $tmp 'xuper-instalar.sh'
$localJson   = Join-Path $tmp 'xuper-install.json'
$localLaunch = Join-Path $tmp 'xuper-launch.json'
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($localSh, $remoteScript, $utf8)
[System.IO.File]::WriteAllText($localJson, $installJson, $utf8)
[System.IO.File]::WriteAllText($localLaunch, $launchJson, $utf8)

$filesOk = $true
foreach ($f in @($localSh, $localJson, $localLaunch)) {
    $leaf = Split-Path -Leaf $f
    if (-not (Send-FileToTv $f ($remoteDir + '/' + $leaf) $tvPass)) { $filesOk = $false; break }
}
if (-not $filesOk) {
    Explain-SshError (Get-SshDiagnosis)
    Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
    Pause-End
    exit 1
}

$sshArgs = @('-p', "$Port") + $script:SshOpts + $authArgs + @(($TvUser + '@' + $TvHost), ('sh ' + $remoteShPath))
if ($script:UseKey) { Invoke-Native 'ssh' $sshArgs } else { Invoke-Native 'ssh' $sshArgs $tvPass }
$installExit = $script:LastExit

Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
# La clave descifrada solo hace falta mientras se instala: se borra ya.
Remove-TvKey

Line
if ($installExit -eq 0) {
    Write-Host ''
    Write-Host '   LISTO. XuperTV esta instalada en tu televisor.' -ForegroundColor Green
    Write-Host ''
    Info 'En la TV aparece en la barra de inicio como "XuperTV".'
    Info 'Si no la ves, apaga y enciende la TV y mira en "Mis aplicaciones".'
    Info ''
    Info 'Para ACTUALIZAR: vuelve a ejecutar este mismo instalador.'
    Info 'Para DESINSTALAR: manten pulsado el boton sobre el icono de la app en la TV.'
    Save-InstallerConfig $tvPass
} else {
    Write-Host ''
    Fail 'La instalacion no termino bien.'
    Info 'Copia el mensaje de arriba y pasalo a quien te dio el archivo.'
    Info 'Prueba tambien a reiniciar la TV y repetir.'
    $script:Fail = 1
}

Pause-End
exit $script:Fail
