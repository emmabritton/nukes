var tl_state = {};
var tl_canvas;
var tl_scaleState = {};
var warSoundEffect = new Audio('sounds/war.mp3');
var mapImage = new Image();
var resetNeeded = true;
var isTouchDevice = false;

const IMAGE_WIDTH = 2917;
const IMAGE_HEIGHT = 1535;
const START = new Date(1945, 0, 1);
const END = new Date(2018, 0, 1);
const FULL_CIRCLE = (Math.PI / 180) * 360;
const MS_PER_DETONATION = 400;
const MAP_SIZE = 0.984;
const MS_PER_DAY = (24 * 60 * 60 * 1000);

var isTooSmall = false;
var message;
var blockedFromPlaying;

function setReadyCallback(callback) {
  mapImage.onload = callback;
  mapImage.src = 'images/world.png';
}

function tl_init(container) {
  console.log("Initialised");
  window.requestAnimationFrame(tl_int_tick);

  container.on('click', function (event) {
    if (isTooSmall&& !iOS && event.offsetY <= tl_scaleState.progressBar.y) {
      analyticEvent('fullscreen toggle', 'player');
      toggleFullScreen();
    }
    if (tl_state.currentDate && event.offsetY >= tl_scaleState.progressBar.y) {
      var x = event.offsetX;
      var percentage = x / container.width();
      var ms = (START.getTime() + percentage * (END.getTime() - START.getTime()));
      tl_state.currentDate = new Date(ms);
      tl_state.dayIndex = Math.abs(tl_state.currentDate.getTime() - START.getTime()) / MS_PER_DAY;
      tl_int_recalcDetonations(tl_state.currentDate);
      if (!tl_state.playing) { 
        resetNeeded = false;
      }
      view_onTimelimeJump(tl_state.playing);
      analyticEvent('timeline jump', 'player', pad(tl_state.currentDate.getDate()) + " " + MONTH_NAMES[tl_state.currentDate.getMonth()] + " " + tl_state.currentDate.getFullYear());
    }
  });

  container.on('mousemove', function (event) {
    if (tl_state.currentDate && event.offsetY >= tl_scaleState.progressBar.y) {
      var x = event.offsetX;
      var percentage = x / container.width();
      var ms = (START.getTime() + percentage * (END.getTime() - START.getTime()));
      tl_state.jumpDate = new Date(ms);
    } else {
      tl_state.jumpDate = null;
    }
  });

  container.on('mouseleave', function (event) {
    tl_state.jumpDate = null;
  });
}

function tl_resize(canvasCtx, width, height) {
  analyticEvent('resize', 'player', width + "," + height);
  console.log("Resized to " + width + "," + height);

  if (height < 280 && iOS) {
    analyticEvent('size', 'site', "ios too small");
    message = "Sorry, this site doesn't work on small devices in landscape.|Please rotate your phone."
    isTooSmall = true;
  } else if (height < 250 && !iOS) {
    analyticEvent('size', 'site', "android too small");
    message = "Sorry, your screen is too small,|click here to go fullscreen|or rotate your phone."
    isTooSmall = true;
  } else {
    message = undefined;
    isTooSmall = false;
  }

  tl_canvas = canvasCtx;
  tl_scaleState.width = width;
  tl_scaleState.height = height;
  tl_scaleState.timelineHeight = height * 0.01;
  tl_scaleState.padding = 8;
  tl_scaleState.targetRadius = Math.min(width, height) * 0.05;

  var res = scaleRatio(width, height * MAP_SIZE, IMAGE_WIDTH, IMAGE_HEIGHT);

  tl_scaleState.map = {};
  tl_scaleState.date = {};
  tl_scaleState.stats = {};
  tl_scaleState.map.offset = {
    x: (width - res[0]),
    y: (height * MAP_SIZE - res[1]) / 2
  };
  tl_scaleState.map.size = {
    width: res[0],
    height: res[1] * MAP_SIZE
  };
  tl_scaleState.date.x = tl_scaleState.padding;
  tl_scaleState.date.y = (height * MAP_SIZE) - (tl_scaleState.padding * 2);
  tl_scaleState.stats.x = tl_scaleState.padding;
  tl_scaleState.stats.y = tl_scaleState.padding * 4;

  var ratio = height / width;
  console.log("RATIO: " + ratio);
  if (ratio < 0.63) {
    tl_scaleState.stats.columnCount = 1;
  } else if (ratio > 0.75) {
    tl_scaleState.stats.columnCount = 2;
  } else {
    tl_scaleState.stats.columnCount = 4;
  }

  tl_scaleState.stats.fontSize = Math.max(24, (height / 900) * 35);

  var duration = END.getTime() - START.getTime();
  var dayDuration = duration / MS_PER_DAY;
  tl_scaleState.progressBar = {};
  tl_scaleState.progressBar.percentage = width / dayDuration;
  tl_scaleState.progressBar.y = height * MAP_SIZE;
  tl_scaleState.progressBar.height = height - tl_scaleState.progressBar.y;

  if (blockedFromPlaying) {
    blockedFromPlaying = false;
    view_play(true);
  }
}

function tl_int_setup() {
  resetNeeded = false;
  console.log("Setup");
  tl_state = {
    analytics: {},
    activeDetonations: [],
    completeDetonations: [],
    playing: false,
    countries: {},
    countrySounds: {},
    dayIndex: 0,
    currentDate: new Date(START),
    jumpDate: undefined,
    nextDayChange: 0,
    lastDayDetonated: new Date(START)
  };
  Object.keys(DATA.COUNTRIES).forEach((countryName) => {
    tl_state.countries[countryName] = {
      detonationCount: 0
    }
    tl_state.countrySounds[countryName] = {
      audios: [],
      lastPlayed: 0
    }
    tl_state.countrySounds[countryName].audios.push(new Audio('sounds/' + countryName.toLowerCase() + '.mp3'))
  });
}

function tl_play() {
  console.log("Playing");
  if (resetNeeded) {
    tl_int_setup();
  }
  tl_state.playing = true;
  tl_int_tick();
} 

function tl_pause() {
  console.log("Paused");
  tl_state.playing = false;
}

function tl_stop() {
  console.log("Stopped");
  tl_int_setup();
}

function tl_setIsTouchDevice() {
  isTouchDevice = true;
}

function tl_int_tick() {
  tl_int_drawBackground(); 
  tl_int_render();
  if (message) {
    console.log("Screen too small to play");
    view_onEndReached();
    blockedFromPlaying = true;
    tl_state.playing = false;
  }
  if (tl_state.playing) {
    tl_int_update();
  }
  window.requestAnimationFrame(tl_int_tick);
}

function tl_int_update() {
  if (tl_state.nextDayChange < Date.now()) {
    tl_state.currentDate.setDate(tl_state.currentDate.getDate() + 1);
    tl_state.nextDayChange = Date.now() + tl_int_msPerDay(tl_state.currentDate);
    tl_state.dayIndex++;
  }
  if (tl_state.lastDayDetonated.getDate() !== tl_state.currentDate.getDate()) {
    tl_state.lastDayDetonated = new Date(tl_state.currentDate);
    tl_int_fireDetonations(tl_state.currentDate);
  }
  tl_int_updateDetonations();
  tl_int_analytics();
  if (tl_state.currentDate >= END) {
    analyticEvent('date reached', 'playback', "end");
    resetNeeded = true;
    tl_state.playing = false;
    view_onEndReached();
  }
}

function tl_int_msPerDay(currentDay) {
  if (!CONFIG.slowOnImportant) return 30;

  if (currentDay.getFullYear() == 1945 && currentDay.getMonth() < 5) {
    return 10;
  } else if (currentDay.getFullYear() == 1945 && currentDay.getMonth() == 6) {
    return 300;
  } else if (currentDay.getFullYear() == 1945 && currentDay.getMonth() == 7 && currentDay.getDate() < 12) {
    return 800;
  } else if (currentDay.getFullYear() < 2000 || currentDay.getFullYear() > 2014) {
    return 30;
  } else {
    return 1;
  }
}

function tl_int_recalcDetonations(target) {
  var end = 0;

  var det = DATA.DETONATIONS[0];
  while (det && det.date < target) {
    end++;
    det = DATA.DETONATIONS[end];
  }

  Object.keys(tl_state.countries).forEach((name) => tl_state.countries[name].detonationCount = 0);
  
  tl_state.completeDetonations = [];
  for (var i = 0; i < end; i++) {
    tl_state.countries[DATA.DETONATIONS[i].country].detonationCount++;
    tl_state.completeDetonations.push({
        detonation: DATA.DETONATIONS[i]
    });
  }

}

function tl_int_fireDetonations(date) {
  DATA.DETONATIONS.forEach((det) => {
    if (det.date.getDate() == date.getDate() && det.date.getMonth() == date.getMonth() && det.date.getFullYear() == date.getFullYear()) {
      var duration = ((det.special == SPECIAL.WAR) ? MS_PER_DETONATION * 3 : MS_PER_DETONATION);
      tl_state.activeDetonations.push({
        detonation: det,
        radius: 0,
        targetRadius: tl_scaleState.targetRadius + (tl_scaleState.targetRadius * det.yield_perc),
        startMs: Date.now(),
        endMs: Date.now() + duration + (duration * det.yield_perc)
      });
      if (CONFIG.sound) {
        if (det.special == SPECIAL.WAR) {
          warSoundEffect.play();
        } else {
          tl_int_playSound(det.country);
        }
      }
      tl_state.countries[det.country].detonationCount++;
    }
  });
}

function tl_int_updateDetonations() {
  var toBeRemoved = [];

  tl_state.activeDetonations.forEach((active) => {
    var percent = (Date.now() - active.startMs) / (active.endMs - active.startMs);
    active.radius = active.targetRadius * percent;
    if (active.radius > active.targetRadius) {
      toBeRemoved.push(active);
    }
  });

  var active = tl_state.activeDetonations.filter(det => !toBeRemoved.includes(det));
  var past = tl_state.activeDetonations.filter(det => toBeRemoved.includes(det));

  tl_state.activeDetonations = active;
  tl_state.completeDetonations = tl_state.completeDetonations.concat(past);
}

function tl_int_playSound(country) {
  tl_state.countrySounds[country].lastPlayed++;
  if (tl_state.countrySounds[country].lastPlayed >= tl_state.countrySounds[country].audios.length) {
    tl_state.countrySounds[country].lastPlayed = 0;
  }
  tl_state.countrySounds[country].audios[tl_state.countrySounds[country].lastPlayed].play();
}

function tl_int_render() {
  if (message !== undefined) {
    drawMessage();
    return;
  }
  if (tl_state.currentDate > START) {
    if (CONFIG.keepDetonationMarkers) {
      tl_int_drawMarkers();
    }
    tl_int_drawDetonations();
    tl_int_drawTimeline();
    tl_int_drawCountryStats();
  }
}

function tl_int_drawBackground() {
  if (isTooSmall) {
    return;
  }
  tl_canvas.fillStyle = 'rgb(0, 0, 50)';

  tl_canvas.fillRect(0, 0, tl_scaleState.width, tl_scaleState.height);

  tl_canvas.drawImage(mapImage, tl_scaleState.map.offset.x, tl_scaleState.map.offset.y, tl_scaleState.map.size.width, tl_scaleState.map.size.height);
}

function tl_int_drawMarkers() {
  tl_state.completeDetonations.forEach((active) => {
    tl_canvas.fillStyle = DATA.COUNTRIES[active.detonation.country].color.marker;

    var x = tl_scaleState.map.offset.x + (tl_scaleState.map.size.width * active.detonation.x);
    var y = tl_scaleState.map.offset.y + (tl_scaleState.map.size.height * active.detonation.y);

    tl_canvas.beginPath();
    if (active.special == SPECIAL.WAR) {
      tl_canvas.arc(x, y, 4, 0, FULL_CIRCLE, true);
    } else {
      tl_canvas.arc(x, y, 2, 0, FULL_CIRCLE, true);
    }
    tl_canvas.fill();
  });
}

function tl_int_drawDetonations() {
  tl_state.activeDetonations.forEach((active) => {
    tl_canvas.fillStyle = DATA.COUNTRIES[active.detonation.country].color.detonation;

    tl_canvas.beginPath();
    tl_canvas.arc(tl_scaleState.map.offset.x + (tl_scaleState.map.size.width * active.detonation.x), 
                  tl_scaleState.map.offset.y + (tl_scaleState.map.size.height * active.detonation.y), 
                  active.radius, 
                  0, 
                  FULL_CIRCLE, 
                  true);
    tl_canvas.fill();
  });
}

function tl_int_drawTimeline() {
  
  tl_canvas.fillStyle = 'rgb(200, 200, 200)';
  tl_canvas.fillRect(0, tl_scaleState.progressBar.y, tl_scaleState.width, tl_scaleState.progressBar.height);

  tl_canvas.fillStyle = 'rgb(80, 30, 255)';
  tl_canvas.fillRect(0, tl_scaleState.progressBar.y, tl_state.dayIndex * tl_scaleState.progressBar.percentage, tl_scaleState.progressBar.height);

  tl_canvas.fillStyle = 'rgb(255,255,255)';

  var text = pad(tl_state.currentDate.getDate()) + " " + MONTH_NAMES[tl_state.currentDate.getMonth()] + " " + tl_state.currentDate.getFullYear();
  if (!isTouchDevice && tl_state.jumpDate) {
    text += " ↠ " + pad(tl_state.jumpDate.getDate()) + " " + MONTH_NAMES[tl_state.jumpDate.getMonth()] + " " + tl_state.jumpDate.getFullYear();
  }

  tl_canvas.font = '2em monospace';
  tl_canvas.fillText(text, tl_scaleState.date.x, tl_scaleState.date.y)
}

function tl_int_drawCountryStats() {
  tl_canvas.textAlign = "left";
  tl_canvas.font = tl_scaleState.stats.fontSize + 'px monospace';

  switch (tl_scaleState.stats.columnCount) {
    case 1: 
      Object.keys(tl_state.countries).forEach((name, idx) => {
        tl_canvas.fillStyle = DATA.COUNTRIES[name].color.marker;
        tl_canvas.fillText(DATA.COUNTRIES[name].name + ": " + tl_state.countries[name].detonationCount, tl_scaleState.stats.x, tl_scaleState.stats.y + (tl_scaleState.stats.fontSize * idx));
      });
    break;
    case 2:
      var drawOnLeft = false;
      Object.keys(tl_state.countries).forEach((name, idx) => {
        drawOnLeft = !drawOnLeft;
        var x = drawOnLeft ? tl_scaleState.stats.x : (tl_scaleState.width * 0.5) + tl_scaleState.stats.x
        tl_canvas.fillStyle = DATA.COUNTRIES[name].color.marker;
        tl_canvas.fillText(DATA.COUNTRIES[name].name + ": " + tl_state.countries[name].detonationCount, x, tl_scaleState.stats.y + (tl_scaleState.stats.fontSize * parseInt(idx/2)));
      });
    break;
    case 4:
      var column = 0;
      var row = 0;
      var divisor = (1 / tl_scaleState.stats.columnCount);
      Object.keys(tl_state.countries).forEach((name, idx) => {
        var x = (tl_scaleState.width * (divisor * column)) + tl_scaleState.stats.x;
        var y = (tl_scaleState.stats.fontSize * row) + tl_scaleState.stats.y;
        tl_canvas.fillStyle = DATA.COUNTRIES[name].color.marker;
        tl_canvas.fillText(DATA.COUNTRIES[name].name + ": " + tl_state.countries[name].detonationCount, x, y);
        column++;
        if (column >= tl_scaleState.stats.columnCount) {
          column = 0;
          row++;
        }
      });
    break;
  }

  if (tl_scaleState.stats.twoLists) {
    var drawOnLeft = false;
    Object.keys(tl_state.countries).forEach((name, idx) => {
      drawOnLeft = !drawOnLeft;
      var x = 0;
      if (drawOnLeft) {
        x = tl_scaleState.stats.x;
        tl_canvas.textAlign = "left";
      } else {
        x = tl_scaleState.width - tl_scaleState.stats.x;
        tl_canvas.textAlign = "right";
      }
      tl_canvas.fillStyle = DATA.COUNTRIES[name].color.marker;
      tl_canvas.fillText(DATA.COUNTRIES[name].name + ": " + tl_state.countries[name].detonationCount, x, tl_scaleState.stats.y + (tl_scaleState.stats.fontSize * parseInt(idx/2)));
    });
    tl_canvas.textAlign = "left";
  } else {
    
  }
}

function drawMessage() {
  tl_canvas.textAlign = "center"
  tl_canvas.font = '24px arial';
  tl_canvas.fillStyle = "rgb(255,255,255)"
  var lines = message.split("|");
  var yOffset = (lines.length * 12)
  lines.forEach((line, idx) => {
    tl_canvas.fillText(line, tl_scaleState.width * 0.5, (tl_scaleState.height * 0.5) - yOffset + (idx * 24), tl_scaleState.width * 0.90);
  });
}

function tl_int_analytics() {
  if (tl_state.analytics.lastDayFired == tl_state.currentDate) {
    return;
  }
  tl_state.analytics.lastDayFired = new Date(tl_state.currentDate);
  var now = tl_state.analytics.lastDayFired;

  if (now.getMonth() == 0 && now.getDate() == 1) {
    if ([1950, 1960, 1970, 1980, 1990, 2000, 2010].includes(now.getFullYear())) {
      analyticEvent('date reached', 'playback', now.getFullYear());
    }
  }
}