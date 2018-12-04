const imageWidth = 2917;
const imageHeight = 1535;

var xOffset = 0;
var yOffset = 0;
var mapWidth = 0;
var mapHeight = 0;
var mapImage;
var ctx;

var targetRadius = 0;
const FULL_CIRCLE = (Math.PI / 180) * 360;
const MS_PER_DETONATION = 400;
var startTime = Date.now();
var currentDetonation = 0;

function reset(callback) {
  mapContainer.empty();
  var canvas = $('<canvas width="' + mapContainer.width() + '" height="' + mapContainer.height() + '"></canvas>')[0];
  mapContainer.append(canvas);
  ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'source-over';
  targetRadius = mapContainer.height() / 18;
  setupMap(callback || function () { });
}

var activeDetonations = [];

function fireDetonations(date) {
  detonations.forEach(function (det) {
    if (det.date.getDate() == date.getDate() && det.date.getMonth() == date.getMonth() && det.date.getFullYear() == date.getFullYear()) {
      if (activeDetonations.filter((detonation) => detonation.detonation == det).length == 0) {
        activeDetonations.push({
          detonation: det,
          radius: 0,
          startMs: Date.now(),
          endMs: Date.now() + ((det.special == 'WAR') ? MS_PER_DETONATION * 3 : MS_PER_DETONATION)
        });
        countries[det.country].detonations++;
      }
    }
  })

  var toBeRemoved = []

  activeDetonations.forEach(function (active) {
    var percent = (Date.now() - active.startMs) / (active.endMs - active.startMs);
    active.radius = targetRadius * percent;
    if (active.radius > targetRadius) {
      toBeRemoved.push(active);
    }
  });

  activeDetonations = activeDetonations.filter(det => !toBeRemoved.includes(det));
}

function drawWorld() {
  ctx.fillStyle = 'rgb(0, 0, 50)';

  ctx.fillRect(0, 0, mapContainer.width(), mapContainer.height());

  ctx.drawImage(mapImage, xOffset, yOffset, mapWidth, mapHeight);
}

function drawFrame() {
  drawWorld();

  activeDetonations.forEach(function (active) {
    if (config.coloring == "type") {
      if (active.detonation.special == 'WAR') {
        ctx.fillStyle = colors.detonation.war;
      } else {
        ctx.fillStyle = colors.detonation.default;
      }
    } else {
      ctx.fillStyle = countries[active.detonation.country].color.detonation;
    }

    ctx.beginPath();
    ctx.arc(xOffset + (mapWidth * active.detonation.x), yOffset + (mapHeight * active.detonation.y), active.radius, 0, FULL_CIRCLE, true);
    ctx.fill();
  });

  drawCountryStats();
}

function calcDetonationsForCountries(target) {
  var end = 0;

  var det = detonations[0];
  while (det && det.date < target) {
    end++;
    det = detonations[end];
  }

  Object.values(countries).forEach(function (country) {
    country.detonations = 0;
  });
  for (var i = 0; i < end; i++) {
    countries[detonations[i].country].detonations++;
  }
}

function drawDetonated(start, end) {
  drawWorld();

  for (var i = start; i <= end; i++) {
    var detonation = detonations[i];
    var x = xOffset + (mapWidth * detonation.x);
    var y = yOffset + (mapHeight * detonation.y);

    countries[detonation.country].detonations++;

    ctx.beginPath();
    if (config.coloring == "type") {
      if (detonation.special == 'WAR') {
        ctx.fillStyle = config.marker.war;
      } else {
        ctx.fillStyle = config.marker.default;
      }
    } else {
      ctx.fillStyle = countries[detonation.country].color.marker;
    }
    if (detonation.special == 'WAR') {
      ctx.arc(x, y, 4, 0, FULL_CIRCLE, true);
    } else {
      ctx.arc(x, y, 2, 0, FULL_CIRCLE, true);
    }
    ctx.fill();
  }

  drawCountryStats();
}

function setupMap(ready) {
  var res = scaleRatio();

  xOffset = (mapContainer.width() - res[0]);
  yOffset = (mapContainer.height() - res[1]) / 2;

  mapImage = new Image();
  mapImage.onload = function () {
    ready();
  }
  mapImage.src = 'images/world.png';

  mapWidth = res[0];
  mapHeight = res[1];
}

function scaleRatio() {
  var targetWidth = mapContainer.width();
  var targetHeight = mapContainer.height();

  var resImage = imageWidth / imageHeight;
  var resTarget = targetWidth / targetHeight;

  var factor = (resTarget > resImage) ? targetHeight / imageHeight : targetWidth / imageWidth;

  return [imageWidth * factor, imageHeight * factor];
}