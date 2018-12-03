const timestep = 16.666667;

var timelineCtx;
var currentDay;
var delta = 0;
var lastFrameTimeMs = 0;
var dayCount = 0;
var progressBarDayPercentage = 0;

var stop = false;
var end;

function resetTimeline() {
  timelineContainer.empty();
  var canvas = $('<canvas width="' + timelineContainer.width() + '" height="' + timelineContainer.height() + '"></canvas>')[0];
  timelineContainer.append(canvas);
  timelineCtx = canvas.getContext("2d");
  timelineCtx.imageSmoothingEnabled = false;
  timelineCtx.globalCompositeOperation = 'source-over';
}

function playTimeline() {
  stop = false;

  dayCount = 0;
  var start = new Date(1945, 0, 0);
  currentDay = start;
  end = new Date(2018, 0, 0);
  var duration = end.getTime() - start.getTime();
  var dayDuration = duration / (24 * 60 * 60 * 1000);
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
    dayCount++;
    currentDay.setDate(currentDay.getDate() + 1);
    nextDayChange = Date.now() + msPerDay();
  }
  fireDetonations(currentDay);
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
  timelineCtx.fillRect(0,0,dayCount * progressBarDayPercentage, timelineContainer.height());

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
  date.textContent = pad(currentDay.getDate()) + " " + MONTH_NAMES[currentDay.getMonth()] + " " + currentDay.getFullYear();
}