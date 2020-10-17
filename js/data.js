const rng = new Math.seedrandom('nukes');
const SPECIAL = {
  WAR: 'WAR'
}
var countries = {};

function resetData() {
  countries = Object.keys(countriesInitalDate).map((name) => [name] = 0);
}

function setupDetonationsData() {
  DATA.DETONATIONS.forEach(det => {
    if (typeof det.special == 'undefined') {
      var xAdjust = getAdjustment(rng());
      var yAdjust = getAdjustment(rng());

      det.x = parseFloat(det.x) + xAdjust;
      det.y = parseFloat(det.y) + yAdjust;
    }
    det.date = new Date(det.date);
  });

  function getAdjustment(value) {
    if (value < 0.15) {
      return -0.002;
    } else if (value < 0.3) {
      return -0.001;
    } else if (value > 0.85) {
      return 0.002;
    } else if (value > 0.7) {
      return 0.001;
    } else {
      return 0;
    }
  }
}