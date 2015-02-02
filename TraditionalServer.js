var net = require('net');
var fs = require('fs');
var async = require('async');

var clients = new Array();

//create a logfilefolder for the current date
var date = new Date().toLocaleDateString();
var folderName ="./TraditionalLogFiles/"+date;

if (fs.existsSync(folderName)) {
    // Dir exists, dont do anything
}
else{
	fs.mkdirSync(folderName);
}


//logfile
var date = new Date();
var logFileName = folderName+"/TraditionalSvrLog"+date.toLocaleTimeString()+".csv";

//Create the server and listen on port 8000
var server = net.createServer().listen(8000);

//Code to get IP address:
var os = require('os');

var interfaces = os.networkInterfaces();
var addresses = [];
for (var k in interfaces) {
    for (var k2 in interfaces[k]) {
        var address = interfaces[k][k2];
        if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
        }
    }
}

console.log(addresses);


//Assuming the address is the first interface
console.log("Server has been started on " + addresses[0] + " on port " +server.address().port+"...");

server.on("connection",function(socket){
	console.log("A client has connected from " + socket.address().address);
	/*
	*Check if the connecting socket is new. If so, add it to our array of clients. If it's not, don't do anything.
	*/
	async.waterfall([
		function(callback){
			checkIfNew(socket,function(err,result){
				if(err) return console.log(err);
				//console.log("The result is "+result);
				callback(null,result);
			})
		},
		//Handle based on whether they are a new client or not.
		function(result,callback){
			if(result == 1){
				//console.log("NEW CLIENT!");
				//brand new client
				var client = new Object();
				client.address = socket.address().address;
				client.records = new Array();
				clients.push(client);
				callback(null,"NEW CLIENT: added to array");
			}
			else{
				callback(null,"EXISTING CLIENT: nothing added to array!");

			}
			//get the amount of connections that the server has right now.
		},function(msg,callback){
			server.getConnections(function(err,numSvrConnections){
				if(err) return console.log(err);
				callback(null,msg,numSvrConnections)
			})

		}
	],function(err,msg,numSvrConnections){
		console.log(msg);
		console.log("Number of clients in array= "+clients.length+"\n Number of connections registered with server= "+numSvrConnections);
	})


	socket.on('data',function(data){
		//Constraint 1: Store the list together with the number of requests generated by each client and the amount of data transffered to each client.
		

		async.waterfall([
			function(callback){
				getClientBySocket(socket,function(err,data){
					clientid = data;
					callback(null,clientid);
				})
			},
			function(clientid,callback){
				addRecord(clientid,data,function(err,data){
					if(err) return console.log(err);
					callback(null);	
				})
			}
			],
			function(err){
				if(err) return console.log(err);
				socket.write(data.toString());
			})
		
	});

	socket.on('close',function(data){
		console.log("Client from " + socket.address() +" disconnected!");
		console.log(socket);
	})

});


function checkIfNew(socket,callback){
	//If array is empty, obviously a new client
	if(clients.length < 1){
		//console.log("Start -New");
		callback(null,1);
	}
	for (var i = 0; i < clients.length; i++) {
		if(clients[i].address == socket.address().address){
			//Exists in array so an EXISTING CLIENT. 0 = NOT NEW
			//console.log("Exists");
			callback(null,0);
		}
	}
			//Doesn't exist in array so NEW CLIENT. 1 = NEW
			//console.log("New");
			//var filename = "client"+clients.length+".csv";
			//fs.openSync("./"+filename,'w');
			//callback(null,1);
		
	
}

function getClientBySocket(socket,callback){
	for (var i = 0; i < clients.length; i++) {
		if(clients[i].address == socket.address().address){
			callback(null,i);
		}
		else{
			callback("ERROR finding client by socket!!");
		}
	};
}

function addRecord(clientid,data,callback){
	//Add record to array
	var record = new Object();
	record.dataSize = data.length;
	console.log("Data size is "+record.dataSize);
	clients[clientid].records.push(record);
	//console.log(clients[clientid].records);

	//Add record to logfile CLIENT,IP,ReqNum,NUM,Size,SIZE,Time,TIME
	var clientAddress = clients[clientid].address;
	var reqNum = clients[clientid].records.length;
	var totalTransferredSize = 0;

	for (var i = 0; i < clients[clientid].records.length; i++) {
		totalTransferredSize = totalTransferredSize + Number(clients[clientid].records[i].dataSize);
		console.log("Total is"+totalTransferredSize);
	};

	var timeStamp = new Date();
	var appendData = "Client,"+clientAddress+",RequestNumber,"+reqNum+",DataTransferred,"+totalTransferredSize+",Time,"+timeStamp.toLocaleTimeString()+"\n";
	fs.openSync(logFileName,'a');
	fs.appendFileSync(logFileName,appendData);

	callback(null,"record for client"+clientid+"and data size "+data.length+"added");
}



