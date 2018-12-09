

function calcDetonationsForCountries(target) {
  var end = 0;

  var det = detonations[0];
  while (det && det.date < target) {
    end++;
    det = detonations[end];
  }

  resetData();
  for (var i = 0; i < end; i++) {
    countries[detonations[i].country].detonations++;
  }
}

function drawDetonated(start, end) {
  resetData();
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
