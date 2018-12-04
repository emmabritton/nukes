const timestep = 16.666667;
const MS_PER_DAY = (24 * 60 * 60 * 1000);

var timelineCtx;
var currentDay;
var delta = 0;
var lastFrameTimeMs = 0;
var dayIndex = 0;
var progressBarDayPercentage = 0;
var lastAnalyticSent = 0;
var dayDuration = 0;
var jumpDay;

var start = new Date(1945, 0, 0);
var playing = false;
var end;

function resetTimeline() {
  timelineContainer.empty();
  var canvas = $('<canvas width="' + timelineContainer.width() + '" height="' + timelineContainer.height() + '"></canvas>')[0];
  timelineContainer.append(canvas);
  timelineCtx = canvas.getContext("2d");
  timelineCtx.imageSmoothingEnabled = false;
  timelineCtx.globalCompositeOperation = 'source-over';

  timelineContainer.on('click', function (event) {
    if (currentDay) {
      var x = event.screenX;
      var percentage = x / timelineContainer.width();
      var ms = (start.getTime() + percentage * (end.getTime() - start.getTime()));
      currentDay = new Date(ms);
      dayIndex = (currentDay.getTime() - start.getTime()) / MS_PER_DAY;
    }
  });

  timelineContainer.on('mousemove', function (event) {
    if (currentDay) {
      var x = event.screenX;
      var percentage = x / timelineContainer.width();
      var ms = (start.getTime() + percentage * (end.getTime() - start.getTime()));
      jumpDay = new Date(ms);
    }
  });

  timelineContainer.on('mouseleave', function (event) {
    jumpDay = null;
  });
}

function playTimeline() {
  stop = false;

  lastAnalyticSent = 0;
  dayIndex = 0;
  currentDay = start;
  end = new Date(2018, 0, 0);
  var duration = end.getTime() - start.getTime();
  dayDuration = duration / MS_PER_DAY;
  progressBarDayPercentage = timelineContainer.width() / dayDuration;

  requestAnimationFrame(mainLoop);
}

function stopTimeline() {
  stop = true;
}
 
function mainLoop(timestamp) {
    if (stop) return;

    delta += timestamp - lastFrameTimeMs; 
    lastFrameTimeMs = timestamp;
    
    while (delta >= timestep) {
        update(timestep);
        delta -= timestep;
    }
    draw();
    if (currentDay <= end) {
      requestAnimationFrame(mainLoop);
    }
}

var nextDayChange = 0;

function update(timestep) {
  if (nextDayChange < Date.now()) {
    dayIndex++;
    currentDay.setDate(currentDay.getDate() + 1);
    nextDayChange = Date.now() + msPerDay();
  }
  fireDetonations(currentDay);
  if (currentDay.getFullYear() == 1950) {
    timelineAnalytic(1950);
  } else if (currentDay.getFullYear() == 1960) {
    timelineAnalytic(1960);
  } else if (currentDay.getFullYear() == 1990) {
    timelineAnalytic(1990);
  } else if (currentDay.getFullYear() == 2000) {
    timelineAnalytic(2000);
  } else if (currentDay.getFullYear() == 2017) {
    timelineAnalytic(2017);
  } else if (currentDay.getFullYear() == 2018) {
    timelineAnalytic(2018);
  }
}

function timelineAnalytic(year) {
  if (lastAnalyticSent == year) return;
  lastAnalyticSent = year;
  gtag('event', year.toString(), {'event_category': 'timeline', 'non_interaction': true});
}

function msPerDay() {
  if (!config.slowOnImportant) return 30;

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

function draw() {
  showDate();
  
  timelineCtx.fillStyle = 'rgb(200, 200, 200)';
  timelineCtx.fillRect(0, 0, timelineContainer.width(), timelineContainer.height());

  timelineCtx.fillStyle = 'rgb(80, 30, 255)';
  timelineCtx.fillRect(0,0,dayIndex * progressBarDayPercentage, timelineContainer.height());

  timelineCtx.fillStyle = 'rgb(0, 0, 50)';
  timelineCtx.fillRect(0, 0, timelineContainer.width(), timelineContainer.height() / 2);

  drawFrame();
}

const MONTH_NAMES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEV"];

function pad(value) {
  if (value.toString().length == 1) {
    return "0" + value;
  } else {
    return value;
  }
}

function showDate() {
  var text = pad(currentDay.getDate()) + " " + MONTH_NAMES[currentDay.getMonth()] + " " + currentDay.getFullYear();
  if (jumpDay) {
    text += " ↠ " + pad(jumpDay.getDate()) + " " + MONTH_NAMES[jumpDay.getMonth()] + " " + jumpDay.getFullYear();
  }
  date.textContent = text;
}