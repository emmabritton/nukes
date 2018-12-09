var tl_state = {};
var tl_canvas;
var tl_scaleState = {};
var warSoundEffect = new Audio('sounds/war.wav');
var mapImage = new Image();

const IMAGE_WIDTH = 2917;
const IMAGE_HEIGHT = 1535;
const START = new Date(1945, 0, 1);
const END = new Date(2018, 0, 1);
const FULL_CIRCLE = (Math.PI / 180) * 360;
const MS_PER_DETONATION = 400;
const MAP_SIZE = 0.984;
const MS_PER_DAY = (24 * 60 * 60 * 1000);

function tl_init(container) {
  console.log("Initialised");
  window.requestAnimationFrame(tl_int_tick);

  container.on('click', function (event) {
    if (tl_state.currentDate) {
      var x = event.offsetX;
      var percentage = x / container.width();
      var ms = (START.getTime() + percentage * (END.getTime() - START.getTime()));
      tl_state.currentDate = new Date(ms);
      tl_state.dayIndex = Math.abs(tl_state.currentDate.getTime() - START.getTime()) / MS_PER_DAY;
      tl_int_recalcDetonations();
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
  console.log("Resized to " + width + "," + height);
  tl_canvas = canvasCtx;
  tl_scaleState.width = width;
  tl_scaleState.height = height;
  tl_scaleState.timelineHeight = height * 0.01;
  tl_scaleState.padding = 8;
  tl_scaleState.targetRadius = Math.min(width, height) * 0.05;

  var res = scaleRatio(width, height * MAP_SIZE, IMAGE_WIDTH, IMAGE_HEIGHT);

  tl_scaleState.map = {};
  tl_scaleState.date = {};
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

  tl_canvas.font = '2em monospace';

  var duration = END.getTime() - START.getTime();
  var dayDuration = duration / MS_PER_DAY;
  tl_scaleState.progressBar = {};
  tl_scaleState.progressBar.percentage = width / dayDuration;
  tl_scaleState.progressBar.y = height * MAP_SIZE;
  tl_scaleState.progressBar.height = height - tl_scaleState.progressBar.y;
}

function tl_setup() {
  console.log("Setup");
  tl_state = {
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
    tl_state.countrySounds[countryName].audios.push(new Audio('sounds/' + countryName.toLocaleLowerCase() + '.wav'))
  });
  mapImage.src = 'images/world.png';
}

function tl_play() {
  console.log("Playing");
  tl_state.playing = true;
} 

function tl_stop() {
  console.log("Stopped");
  tl_state.playing = false;
}

function tl_int_tick() {
  tl_int_drawBackground();
  if (tl_state.playing) {
    tl_int_update();
    tl_int_render();
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
  
  for (var i = 0; i < end; i++) {
    tl_state.countries[DATA.DETONATIONS[i].country].detonationCount++;
  }
}

function tl_int_fireDetonations(date) {
  DATA.DETONATIONS.forEach((det) => {
    if (det.date.getDate() == date.getDate() && det.date.getMonth() == date.getMonth() && det.date.getFullYear() == date.getFullYear()) {
      tl_state.activeDetonations.push({
        detonation: det,
        radius: 0,
        startMs: Date.now(),
        endMs: Date.now() + ((det.special == SPECIAL.WAR) ? MS_PER_DETONATION * 3 : MS_PER_DETONATION)
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
    active.radius = tl_scaleState.targetRadius * percent;
    if (active.radius > tl_scaleState.targetRadius) {
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
  if (CONFIG.keepDetonationMarkers) {
    tl_int_drawMarkers();
  }
  tl_int_drawDetonations();
  tl_int_drawTimeline();
  tl_int_drawCountryStats();
}

function tl_int_drawBackground() {
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
  if (tl_state.jumpDate) {
    text += " ↠ " + pad(tl_state.jumpDate.getDate()) + " " + MONTH_NAMES[tl_state.jumpDate.getMonth()] + " " + tl_state.jumpDate.getFullYear();
  }
  tl_canvas.fillText(text, tl_scaleState.date.x, tl_scaleState.date.y)
}

function tl_int_drawCountryStats() {

}