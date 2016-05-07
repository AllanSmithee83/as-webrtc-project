

//Variable declarations for the high level screens of our single page app
var landingPageDiv = document.querySelector("#landingPage");
var caller1EntryDiv = document.querySelector("#caller1Entry");
var caller2SignupDiv = document.querySelector("#caller2Signup");
var videoPageDiv = document.querySelector("#videoPage");

//Variable declarations for other controls used on the signup pages and necessary for app flow
var caller1Name = document.querySelector("#caller1Name");
var caller2Name = document.querySelector("#caller2Name");
var enterAsCaller1 = document.querySelector("#enterAsCaller1");
var requestCaller2 = document.querySelector("#requestCaller2");
var requestCaller2Form = document.querySelector("#requestCaller2Form");
var waitingForCaller2 = document.querySelector("#waitingForCaller2");
var waitingForCaller2Progress = document.querySelector("#waitingForCaller2Progress");
var caller2SignupForm = document.querySelector("#caller2SignupForm");
var caller2SignupButton = document.querySelector("#caller2SignupButton");
var waitingForCaller1 = document.querySelector("#waitingForCaller1");
var caller2Listing = document.querySelector("#caller2Listing");
var callCaller2 = document.querySelector("#callCaller2");
var enterAsCaller2 = document.querySelector("#enterAsCaller2");

//Enter the application as a caller1 and toggle the div's
enterAsCaller1.addEventListener('click', function(ev){
	landingPageDiv.style.display = 'none';
	caller1EntryDiv.style.display = 'block';
	caller2SignupDiv.style.display = 'none';
	videoPageDiv.style.display = 'none';
	
	myUserType = "caller1"
	requestCaller2Form.style.display = 'block';
	waitingForCaller2.style.display = 'none';
	caller2Listing.style.display = 'none';
	ev.preventDefault();
}, false);

//For the caller1 after they enter their basic information they will need to wait for a caller2 to arrive at this point
//Signaling code will trigger an update to this view once a caller2 has arrived

requestCaller2.addEventListener('click', function(ev){
	requestCaller2Form.style.display = 'none';
	waitingForCaller2.style.display = 'block';
	caller2Listing.style.display = 'none';
	
	//The caller1 joins the signaling room in socket.io
	caller1UserName = caller1Name.value || 'no name';
	myName = caller1UserName;
	io.emit('signal', {"user_type": "caller1", "user_name": caller1UserName, "user_data": "no data", "command": "joinroom"});
	console.log("caller1 " + caller1UserName + " has joined.");
	
	ev.preventDefault();
}, false);

/*
//This code should be removed, it is only for clickable prototype purposes
//This allows you to click on the caller1 progress bar and advance to the 
//video screen without a caller2.
waitingForCaller2Progress.addEventListener('click', function(ev){
	requestCaller2Form.style.display = 'none';
	waitingForCaller2.style.display = 'none';
	caller2Listing.style.display = 'block';
	ev.preventDefault();
}, false);
*/
//Enter the application as a caller2 and progress to the sign up form
enterAsCaller2.addEventListener('click', function(ev){
	landingPageDiv.style.display = 'none';
	caller1EntryDiv.style.display = 'none';
	caller2SignupDiv.style.display = 'block';
	videoPageDiv.style.display = 'none';
	
	myUserType = "caller2"
	caller2SignupForm.style.display = 'block';
	waitingForCaller1.style.display = 'none';
	ev.preventDefault();
}, false);

//Allows the caller2 to "sign up" by entering their name 
caller2SignupButton.addEventListener('click', function(ev){
	caller2SignupForm.style.display = 'none';
	waitingForCaller1.style.display = 'block';
	
	//The caller2 joins the signaling room in socket.io
	caller2UserName = caller2Name.value || 'no name';
	myName = caller2UserName;
	io.emit('signal', {"user_type": "caller2", "user_name": caller2UserName, "user_data": "no data", "command": "joinroom"});
	console.log("caller2 " + caller2UserName + " has joined.");
	
	ev.preventDefault();
}, false);

//Once a caller2 has arrived on the caller2 listing view,a caller1 calls them from this button
callCaller2.addEventListener('click', function(ev){
	landingPageDiv.style.display = 'none';
	caller1EntryDiv.style.display = 'none';
	videoPageDiv.style.display = 'block';
	
	//Send a signal that the caller1 is calling
	caller1UserName = caller1Name.value || 'no name';
	io.emit('signal', {"user_type": "caller1", "user_name": caller1UserName, "user_data": "calling caller2", "command": "call"});
	console.log("caller1 " + caller1UserName + " is calling.");
	
	//Kick off the WebRTC signaling
	//Setup the RTC Peer Connection object
	if (!rtcPeerConn) startSignaling();
	
	ev.preventDefault();
}, false);

