import jadx.api.JadxArgs;
import jadx.api.JadxDecompiler;
import java.io.File;

public class DumpRes {
    public static void main(String[] args) throws Exception {
        JadxArgs a = new JadxArgs();
        a.setInputFile(new File(args[0]));
        a.setOutDir(new File(args[1]));
        a.setSkipSources(true);
        a.setSkipResources(false);
        a.setSkipFilesSave(false);
        a.setThreadsCount(4);
        JadxDecompiler d = new JadxDecompiler(a);
        d.load();
        d.saveResources();
        d.close();
        System.out.println("RESOURCES_EXPORTED");
    }
}
