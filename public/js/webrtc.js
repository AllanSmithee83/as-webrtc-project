
/* connect to server */
io = io.connect();

var myName = "";
var theirName = "";
var myUserType = "";
var configuration = {
	'iceServers': [{
		'url': 'stun:stun.l.google.com:19302'
	}]
};
var rtcPeerConn;
var mainVideoArea = document.querySelector("#mainVideoTag");
var smallVideoArea = document.querySelector("#smallVideoTag");

var dataChannel;

var dataChannelOptions = {
	ordered: true, //no guaranteed delivery, unreliable but faster 
	maxRetransmitTime: 1000, //milliseconds
};


/*define signal handler*/
io.on('signal', function(data) {
	if (data.user_type == "caller2" && data.command == "joinroom") {
		console.log("The caller2 is here!");
		if (myUserType == "caller1") {
			theirName = data.user_name;
			document.querySelector("#messageOutName").textContent = theirName;
			document.querySelector("#messageInName").textContent = myName;
		}
		//Switch to the doctor listing
		document.querySelector("#requestCaller2Form").style.display = 'none';
		document.querySelector("#waitingForCaller2").style.display = 'none';
		document.querySelector("#caller2Listing").style.display = 'block';
	}
	else if (data.user_type == "caller1" && data.command == "call") {
		console.log("Caller1 is calling");
		if (myUserType == "caller2") {
			theirName = data.user_name;
			document.querySelector("#messageOutName").textContent = theirName;
			document.querySelector("#messageInName").textContent = myName;
		}
		document.querySelector("#caller2Signup").style.display = 'none';
		document.querySelector("#videoPage").style.display = 'block';
	}
	
	else if (data.user_type == 'signaling') {
		if (!rtcPeerConn) startSignaling();
		var message = JSON.parse(data.user_data);
		if (message.sdp) {
			rtcPeerConn.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
				// if we received an offer, we need to answer
				if (rtcPeerConn.remoteDescription.type == 'offer') {
					rtcPeerConn.createAnswer(sendLocalDesc, logError);
				}
			}, logError);
		}
		else {
			rtcPeerConn.addIceCandidate(new RTCIceCandidate(message.candidate));
		}
	}
}); 

//see  - http://www.html5rocks.com/en/tutorials/webrtc/infrastructure/ 
//example http://www.w3.org/TR/webrtc/#simple-peer-to-peer-example    

function startSignaling() {
	console.log("starting signaling...");
	rtcPeerConn = new webkitRTCPeerConnection(configuration);
	dataChannel = rtcPeerConn.createDataChannel('textMessages', dataChannelOptions);
				
	dataChannel.onopen = dataChannelStateChanged;
	rtcPeerConn.ondatachannel = receiveDataChannel;
	
	
	
	
//define several handlers we need  for webrtc connection to be establish (when we have icecandidate ready to sent our peer , event haneler fired -sent that candidate over socketio chanell to anyone on it ) 
//how we can connect our peer directly, use stun or turn servers as nessessery to setablish direct p2p connection through firewalls and routers. 
	
	// send any ice candidates to the other peer
		rtcPeerConn.onicecandidate = function (evt) {
		if (evt.candidate)
			io.emit('signal',{"user_type":"signaling", "command":"icecandidate", "user_data": JSON.stringify({ 'candidate': evt.candidate })});
		console.log("completed sending an ice candidate...");
	};
	
	// let the 'negotiationneeded' event trigger offer generation
	rtcPeerConn.onnegotiationneeded = function () {
		console.log("on negotiation called");
		rtcPeerConn.createOffer(sendLocalDesc, logError);
	};
	
	// once remote stream arrives, show it in the main video element
	rtcPeerConn.onaddstream = function (evt) {
		console.log("going to add their stream...");
		mainVideoArea.src = URL.createObjectURL(evt.stream);
	};
	
	// get a local stream, show it in our video tag and add it to be sent
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
	navigator.getUserMedia({
		'audio': false,
		'video': true
	}, function (stream) {
		console.log("going to display my stream...");
		smallVideoArea.src = URL.createObjectURL(stream);
		rtcPeerConn.addStream(stream);
	}, logError);
			  
}

function sendLocalDesc(desc) {
	rtcPeerConn.setLocalDescription(desc, function () {
		console.log("sending local description");
		io.emit('signal',{"user_type":"signaling", "command":"SDP", "user_data": JSON.stringify({ 'sdp': rtcPeerConn.localDescription })});
	}, logError);
}
			
function logError(error) {
}


//////MUTE/PAUSE STREAMS CODE//////
var muteMyself = document.querySelector("#muteMyself");
var pauseVideo = document.querySelector("#pauseVideo");

muteMyself.addEventListener('click', function(ev){
	console.log("muting/unmuting myself");
	var streams = rtcPeerConn.getLocalStreams();
	for (var stream of streams) {
		for (var audioTrack of stream.getAudioTracks()) {
			if (audioTrack.enabled) { muteMyself.innerHTML = "Unmute" }
			else { muteMyself.innerHTML = "Mute Myself" }
			audioTrack.enabled = !audioTrack.enabled;
		}
		console.log("Local stream: " + stream.id);
	}
	ev.preventDefault();
}, false);

pauseVideo.addEventListener('click', function(ev){
	console.log("pausing/unpausing my video");
	var streams = rtcPeerConn.getLocalStreams();
	for (var stream of streams) {
		for (var videoTrack of stream.getVideoTracks()) {
			if (videoTrack.enabled) { pauseVideo.innerHTML = "Start Video" }
			else { pauseVideo.innerHTML = "Pause Video" }
			videoTrack.enabled = !videoTrack.enabled;
		}
		console.log("Local stream: " + stream.id);
	}
	ev.preventDefault();
}, false);

/////////////Data Channels Code///////////
var messageholder = document.querySelector("#messageholder");
var myMessage = document.querySelector("#myMessage");
var sendMessage = document.querySelector("#sendMessage");
var receivedFileName;
var receivedFileSize;
var fileBuffer = [];
var fileSize = 0;
var fileTransferring = false;


function dataChannelStateChanged() {
	if (dataChannel.readyState === 'open') {
		console.log("Data Channel open");
		dataChannel.onmessage = receiveDataChannelMessage;
	}
}

function receiveDataChannel(event) {
	console.log("Receiving a data channel");
	dataChannel = event.channel;
	dataChannel.onmessage = receiveDataChannelMessage;
}

function receiveDataChannelMessage(event) {
	console.log("From DataChannel: " + event.data);
	if (fileTransferring) {
		//Now here is the file handling code:
		fileBuffer.push(event.data);
		fileSize += event.data.byteLength;
		fileProgress.value = fileSize;
				
		//Provide link to downloadable file when complete
		if (fileSize === receivedFileSize) {
			var received = new window.Blob(fileBuffer);
			fileBuffer = [];

			downloadLink.href = URL.createObjectURL(received);
			downloadLink.download = receivedFileName;
			downloadLink.appendChild(document.createTextNode(receivedFileName + "(" + fileSize + ") bytes"));
			fileTransferring = false;
			
			//Also put the file in the text chat area
			var linkTag = document.createElement('a');
			linkTag.href = URL.createObjectURL(received);
			linkTag.download = receivedFileName;
			linkTag.appendChild(document.createTextNode(receivedFileName));
			var div = document.createElement('div');
			div.className = 'message-out';
			div.appendChild(linkTag);
			messageHolder.appendChild(div);
		}
	}
	else {
		appendChatMessage(event.data, 'message-out');
	}
}

function receiveDataChannelMessage(event) {
	console.log("From DataChannel: " + event.data);
	appendChatMessage(event.data, 'message-out');
}

sendMessage.addEventListener('click', function(ev){
	dataChannel.send(myMessage.value);
	appendChatMessage(myMessage.value, 'message-in');
	myMessage.value = "";
	ev.preventDefault();
}, false);

function appendChatMessage(msg, className) {
	var div = document.createElement('div');
	div.className = className;
	div.innerHTML = '<span>' + msg + '</span>';
	messageholder.appendChild(div);
}
/////////////File Transfer///////////
var sendFile = document.querySelector("input#sendFile");
var fileProgress = document.querySelector("progress#fileProgress");
var downloadLink = document.querySelector('a#receivedFileLink');

io.on('files', function(data) {
	receivedFileName = data.filename;
	receivedFileSize = data.filesize;
	console.log("File on it's way is " + receivedFileName + " (" + receivedFileSize + ")");
	fileTransferring = true;
});

sendFile.addEventListener('change', function(ev){
	var file = sendFile.files[0];
	console.log("sending file " + file.name + " (" + file.size + ") ...");
	io.emit('files',{"filename":file.name, "filesize":file.size});
	appendChatMessage("sending " + file.name, 'message-in');
	fileTransferring = true;
						
	fileProgress.max = file.size;
	var chunkSize = 16384;
	var sliceFile = function(offset) {
		var reader = new window.FileReader();
		reader.onload = (function() {
			return function(e) {
				dataChannel.send(e.target.result);
				if (file.size > offset + e.target.result.byteLength) {
					window.setTimeout(sliceFile, 0, offset + chunkSize);
				}
				fileProgress.value = offset + e.target.result.byteLength;
			};
		})(file);
		var slice = file.slice(offset, offset + chunkSize);
		reader.readAsArrayBuffer(slice);
	};
	sliceFile(0);
	fileTransferring = false;
}, false);
