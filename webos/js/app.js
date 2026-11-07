var currentScreen = 'home';
var navItems = [];
var navIndex = 0;
var contentCards = [];
var cardIndex = 0;
var inPlayer = false;

var testData = {
  home: [
    {id: 1, title: 'Prueba 1'},
    {id: 2, title: 'Prueba 2'},
    {id: 3, title: 'Prueba 3'}
  ],
  live: [
    {id: 101, title: 'Canal Prueba A'},
    {id: 102, title: 'Canal Prueba B'},
    {id: 103, title: 'Canal Prueba C'}
  ],
  movies: [
    {id: 201, title: 'Pelicula Prueba 1'},
    {id: 202, title: 'Pelicula Prueba 2'}
  ],
  series: [
    {id: 301, title: 'Serie Prueba 1'},
    {id: 302, title: 'Serie Prueba 2'}
  ]
};

function init() {
  navItems = document.getElementsByClassName('nav-item');
  if (navItems.length > 0) {
    navItems[navIndex].className = 'nav-item focused';
  }
  renderScreen('home');
  document.addEventListener('keydown', onKeyDown);
}

function renderScreen(screenName) {
  var screens = document.getElementsByClassName('screen');
  for (var i = 0; i < screens.length; i++) {
    screens[i].className = 'screen';
  }
  if (screenName === 'home') {
    document.getElementById('screen-home').className = 'screen active';
    renderGrid('grid-home', testData.home);
  } else if (screenName === 'live') {
    document.getElementById('screen-live').className = 'screen active';
    renderGrid('grid-live', testData.live);
  } else if (screenName === 'movies') {
    document.getElementById('screen-movies').className = 'screen active';
    renderGrid('grid-movies', testData.movies);
  } else if (screenName === 'series') {
    document.getElementById('screen-series').className = 'screen active';
    renderGrid('grid-series', testData.series);
  } else if (screenName === 'search') {
    document.getElementById('screen-search').className = 'screen active';
    var searchInput = document.getElementById('search-input');
    searchInput.className = 'focused';
    cardIndex = -1;
    contentCards = [];
    return;
  } else if (screenName === 'config') {
    document.getElementById('screen-config').className = 'screen active';
    var configItems = document.getElementsByClassName('config-item');
    for (var c = 0; c < configItems.length; c++) {
      configItems[c].className = 'config-item';
    }
    if (configItems.length > 0) {
      configItems[0].className = 'config-item focused';
    }
    cardIndex = -1;
    contentCards = [];
    return;
  } else if (screenName === 'player') {
    document.getElementById('screen-player').className = 'screen active';
    var player = document.getElementById('player');
    player.src = 'https://www.w3schools.com/html/mov_bbb.mp4';
    try {
      player.load();
      player.play();
    } catch (e) {}
    var playerInfo = document.getElementById('player-info');
    playerInfo.className = 'player-info visible';
    setTimeout(function() {
      playerInfo.className = 'player-info';
    }, 3000);
    inPlayer = true;
    return;
  }
  currentScreen = screenName;
  cardIndex = 0;
}

function renderGrid(gridId, data) {
  var grid = document.getElementById(gridId);
  grid.innerHTML = '';
  contentCards = [];
  for (var i = 0; i < data.length; i++) {
    var card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = -1;
    var title = document.createElement('div');
    title.className = 'card-title';
    title.innerHTML = data[i].title;
    card.appendChild(title);
    card.setAttribute('data-id', data[i].id);
    grid.appendChild(card);
    contentCards.push(card);
  }
  if (contentCards.length > 0) {
    contentCards[0].className = 'card focused';
    cardIndex = 0;
  }
}

function onKeyDown(e) {
  var keyCode = e.keyCode;
  if (inPlayer) {
    if (keyCode === 8 || keyCode === 27 || keyCode === 461) {
      e.preventDefault();
      exitPlayer();
      return;
    }
    return;
  }
  
  if (currentScreen === 'search') {
    if (keyCode === 8 || keyCode === 27 || keyCode === 461) {
      e.preventDefault();
      goToNav(navIndex);
      return;
    }
    return;
  }
  
  if (currentScreen === 'config') {
    var configItems = document.getElementsByClassName('config-item');
    if (keyCode === 40) {
      e.preventDefault();
      var idx = getFocusedIndex(configItems);
      configItems[idx].className = 'config-item';
      if (idx < configItems.length - 1) idx++;
      configItems[idx].className = 'config-item focused';
      return;
    }
    if (keyCode === 38) {
      e.preventDefault();
      var idx2 = getFocusedIndex(configItems);
      configItems[idx2].className = 'config-item';
      if (idx2 > 0) idx2--;
      configItems[idx2].className = 'config-item focused';
      return;
    }
    if (keyCode === 8 || keyCode === 27 || keyCode === 461) {
      e.preventDefault();
      goToNav(navIndex);
      return;
    }
    return;
  }
  
  if (keyCode === 37) {
    e.preventDefault();
    navIndex = 0;
    updateNavFocus();
    goToNav(navIndex);
    return;
  }
  if (keyCode === 39) {
    e.preventDefault();
    if (contentCards.length > 0 && cardIndex >= 0) {
      if (cardIndex < contentCards.length - 1) {
        contentCards[cardIndex].className = 'card';
        cardIndex++;
        contentCards[cardIndex].className = 'card focused';
      }
    }
    return;
  }
  if (keyCode === 40) {
    e.preventDefault();
    if (navIndex < navItems.length - 1) {
      navItems[navIndex].className = 'nav-item';
      navIndex++;
      navItems[navIndex].className = 'nav-item focused';
    }
    return;
  }
  if (keyCode === 38) {
    e.preventDefault();
    if (navIndex > 0) {
      navItems[navIndex].className = 'nav-item';
      navIndex--;
      navItems[navIndex].className = 'nav-item focused';
    }
    return;
  }
  if (keyCode === 13) {
    e.preventDefault();
    goToNav(navIndex);
    return;
  }
  if (keyCode === 8 || keyCode === 27 || keyCode === 461) {
    e.preventDefault();
    return;
  }
}

function getFocusedIndex(items) {
  for (var i = 0; i < items.length; i++) {
    if (items[i].className.indexOf('focused') >= 0) return i;
  }
  return 0;
}

function updateNavFocus() {
  for (var i = 0; i < navItems.length; i++) {
    navItems[i].className = 'nav-item';
  }
  if (navItems[navIndex]) {
    navItems[navIndex].className = 'nav-item focused';
  }
}

function goToNav(index) {
  var screens = ['home', 'live', 'movies', 'series', 'search', 'config'];
  var screenName = screens[index];
  currentScreen = screenName;
  for (var i = 0; i < navItems.length; i++) {
    navItems[i].className = 'nav-item';
  }
  if (navItems[index]) {
    navItems[index].className = 'nav-item focused';
  }
  if (screenName === 'home') {
    renderScreen('home');
  } else if (screenName === 'live') {
    renderScreen('live');
  } else if (screenName === 'movies') {
    renderScreen('movies');
  } else if (screenName === 'series') {
    renderScreen('series');
  } else if (screenName === 'search') {
    renderScreen('search');
  } else if (screenName === 'config') {
    renderScreen('config');
  }
}

function exitPlayer() {
  var player = document.getElementById('player');
  try {
    player.pause();
  } catch (e) {}
  player.src = '';
  document.getElementById('screen-player').className = 'screen';
  inPlayer = false;
  goToNav(navIndex);
}

window.onload = init;
