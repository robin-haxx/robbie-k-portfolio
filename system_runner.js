

let playlist = Math.floor(Math.random()); //mult by 2 when playlist 2 works
let firstLoad = false;

var canvasWidth = 1920;
var canvasHeight = 1080;
var canvasSize = [canvasWidth,canvasHeight];

let mainCanvas;
let songCount = 15 // UPDATE THIS AND THIS ONLY AS YOU ADD MORE SONGS. 
let textInput;
let slider1, slider2, slider3, slider4;
let songButton;

let editorMode = true;          // false when in song mode
//let songLoadStatus = "loading"; // "error", "loaded"
let song;
let songIsPlaying = false;
let songEpoch = 0;   // millis when song starts
let songID = 0;      // ID to fetch song files
let table;
let words;

let songs = new Array(songCount);   // stores all loaded song .mp3s
let tables = new Array(songCount);  // stores volumes for all songs



//  use songID to set current
//  make loop scalable later
let playBuffer = 0;

function preload() {
  console.log ("loading playlist #" + (playlist+1));
  if (playlist == 1){
    playBuffer += (8 * playlist);
  }


  songID += playBuffer;
  console.log("preloadID:" + songID);
  console.log("writing table data for song " + songID);
  table = tables [songID];
  console.log("writing song data for song " + songID);
  song = songs[songID];  
  console.log("loading words " + songID);
  words = loadStrings('words.txt'); //anything containing "words" is deprecated, just empty variables, will remove when I can be bothered
  console.log("preload complete");
}

let volumes = [];
let volume_length = 0;

function setup() {
  console.log("setting up canvas");
  
  let main_canvas = createCanvas(canvasSize[0], canvasSize[1]);
  main_canvas.parent('sketch-container');
  
  frameRate(100);
  angleMode(DEGREES);


}


function switchRunMode() {
console.log("running unnecessary function: switchRunMode");
}

function draw() {

  canvasSize = [window.innerWidth,window.innerHeight];

  if (editorMode) {
    //let w = textInput.value();
    let s1 = 40;
    let s2 = 40;
    let s3 = 20;
    let s4 = 10;

    draw_one_frame(s1, s2, s3, s4, 0);
  }
  else {
    if(songEpoch > 0) {
      let now = millis();
      let songOffset = now - songEpoch;
      if(songOffset < 0) {
        background(0);
        let secondsRemaining = songOffset / -1000.0;
        let intSecs = int(secondsRemaining);
        if(intSecs > 0) {
          let remainder = secondsRemaining - intSecs;
          let curAngle = map(remainder, 0, 1, 630, 270);
          // print(secondsRemaining, intSecs, remainder, curAngle);
          noStroke();
          fill(200);
          arc(width/2, height/2, 400, 400, curAngle, curAngle+10);
          stroke(255);
          fill(255);
          textSize(200);
          textAlign(CENTER, CENTER);
          text(intSecs, width/2, height/2);
        }
        // text("Song starting in: " + secondsRemaining, width/2, height/2)      
      }
      else if (!songIsPlaying) {
        song.play();
        songIsPlaying = true;
        songEpoch = millis();
        if (typeof reset_music === "function") {
          reset_music();
        }
      }
    }
  }
}

