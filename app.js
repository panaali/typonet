;
var App = App || {};
App.SocketIO = {
	config: {
	},
	
	stats: {
		recievedPackets: 0,
		sentPackets: 0,
		visitors: 0,
		createdTime: 0
	},
	
	rooms: {
		rooms: {
			room1: {
				desc: 'test room',
				admin: 'admin',
				users: {
					admin :{
						id: 1,
						name: 'soroush',
						level: 4,//admin (simillar to xmpp access levels [4,3,2,1])
						lastActivity: 0//unix timestamp
					}
				},
				packets:[],
				activities: [],
				isPublic: true
			}
		},
		
		acl: {
			RoomDelete: 4,
			RoomLeave: 1,
		
			ElementAdd: 4,
			ElementRemove: 4,
			AddElementView: 1,
			
			MessageAdd: 1,//guest
			MessageView: 1,//guest
			
			UserJoinView: 1,
			UserLeaveView: 1,
			
			UserKick: 4,
			
			ActivityGet: 3
		},
		
		methods: {
			checkRole: function(action, userName, roomName) {
				var self = App.SocketIO;
				var rooms = self.rooms.rooms;
				var G_Methods = self.methods;
				var actionLevel, userLevel;
				if (rooms[roomName] && rooms[roomName].users[userName] ) {
					if ( self.rooms.acl[action] && self.rooms.acl[action] <= rooms[roomName].users[userName].level) {
						return true;
					}
				}
				return false;
			},
		
			createRoom: function(roomName, userName, clientID, name, isPublic) {
				var self = App.SocketIO;
				var room = self.rooms;
				var rooms = self.rooms.rooms;
				
				self.logger("rooms->methods->createRoom(): Going to create a new room...");
				console.log(rooms);
				if (!rooms[roomName]) {
					rooms[roomName] = {
						admin: userName,
						users : {},
						packets:[],
						activities: [],
						isPublic: isPublic || true
					};
					room.methods.joinRoom(roomName, userName, clientID, self.resources.childSocket, 4);
					self.logger("rooms->methods->createRoom(): Room '" + roomName + "' created successfully...");
					return true;
				} else {
					self.logger("rooms->methods->createRoom(): There is another room with this name :( ");
					return false;
				}
			},
			
			
			joinRoom: function(roomName, userName, clientID, socket, level) {
				var self = App.SocketIO;
				var room = self.rooms;
				var rooms = self.rooms.rooms;
				
				self.logger("rooms->methods->joinRoom(): Going to join the user '" + userName + "' to room '" + roomName + "' ...");
				if (rooms[roomName] && !rooms[roomName].users[userName]) {
					for (x in rooms[roomName].users) {
						if (rooms[roomName].users[x].id == clientID) {
							self.logger("rooms->methods->joinRoom(): The user '" + userName + "' with sessionID '" + clientID + "' already exists in this room ");
							return false;
						}
					}
					rooms[roomName].users[userName] = {
						userName : userName,
						id: clientID,
						name: userName,
						level: level || 1,//member
						lastActivity: 0
					};
					
					//assiging the room details to the client
					socket.roomName = roomName;
					socket.userName = userName;
					socket.join(socket.roomName);
					socket.broadcast.to(socket.roomName).emit('userJoinView', {
						methodName: 'userJoinView', 
						params: {
							msg: "The user '" + userName + "' joined to room '" 
						}
					});

					self.logger("rooms->methods->joinRoom(): The user '" + userName + "' joined to room '" + roomName +"' successfully...");
					console.log("\n\n\n\n\n\n\n");
					console.log(rooms[roomName].users);
					return true;
				} else {
					self.logger("rooms->methods->joinRoom(): Cannot join this user... ");
					return false;
				}
			},
			
			leaveRoom: function(roomName, socket) {
				var uName = socket.userName || false;
				if (!uName)
					return false;
				var packet;
				if (this.checkRole('RoomLeave', uName, roomName)) {
					packet = App.SocketIO.methods.packetCreator('roomLeave', {userName: uName, roomName: roomName});
					socket.broadcast.to(roomName).emit('packet', packet);
					delete App.SocketIO.rooms.rooms[roomName].users[uName];
				}
			},
			
			deleteRoom: function(roomName, socket) {
				var self = App.SocketIO;
				var methods = self.rooms.methods;//alternativly : this
				console.log(methods.getUserRoom(socket.id));
				if ( socket.id ) {
					var uName = this.getUserName(socket);
					console.log(uName);
					methods.checkRole('RoomDelete', uName, roomName );
					if ( methods.checkRole('RoomDelete', uName, roomName ) ) {
						packet = App.SocketIO.methods.packetCreator('roomDelete', {roomName: roomName});
						methods.getUserRoom(socket.id, function(room, user) {
							if (room == roomName)
								delete App.SocketIO.rooms.rooms[room];
						});
						socket.broadcast.in(roomName).emit('packet', packet);
					}
				}
			},
			
			
			sendMessage: function(message, socket) {
				var self = App.SocketIO;
				var methods = self.rooms.methods;//alternativly : this
				if (socket.id) {
					room = socket.roomName;
					uName = socket.userName;
					
					console.log(message);
					uName = methods.getUserName(socket);
					if (methods.checkRole('MessageAdd', uName, room)) {
						
						packet = App.SocketIO.methods.packetCreator('MessageView', {msg: message, sender: uName, time: Math.round( (new Date().getTime() ) / 1000 ) });
						socket.broadcast.to(room).emit('packet', packet);
					}
				}
			},
			
			
			getUserRoom: function( clientID, callback ) {
				var rooms = App.SocketIO.rooms.rooms;
				var ret = [];
				for ( x in rooms ) {
					for ( y in rooms[x].users ) {
						if ( rooms[x] && rooms[x].users[y].id == clientID ) {
							if ( callback && typeof callback == "function")
								callback(x, y);
							ret.push(x);//x->roomName, y->userName
						}
					}
				}
				return ret;
			},
			
			//get userName by socket or socket.id
			getUserName: function(client) {
				var self = App.SocketIO;
				var roomName, id;
				var ret = false;
				if (typeof client == "string") {
					id = client;
					roomName = this.getUserRoom(client);
					
				} else if (typeof client == "object" && client.id) {
					roomName = this.getUserRoom(client.id);
					id = client.id;
					
				} else {
					roomName = false;
				}
				if (roomName != false) {
					
					for (x in self.rooms.rooms[roomName[0]].users) {
						if ( self.rooms.rooms[roomName[0]].users[x].id == id ) {
							ret = self.rooms.rooms[roomName[0]].users[x].userName;
						}
					}
				}
				return ret;
			},
				
			
			levelSeprator: function(roomName) {
				
				var levels = {
					admin: [],
					moderator: [],
					member: [],
					guest: []
				};
				
				room = App.SocketIO.rooms.rooms[roomName] || false;
				if (!room) {
					return levels;
				}
				for (x in room.users) {
					level = room.users[x].level;
					switch ( level ) {
						case "4": 
							levels[admin].push(room.users[x]);
							break;
						case "3":
							levels[moderator].push(room.users[x]);
							break;
						case "2":
							levels[member].push(room.users[x]);
							break;
						case "1":
							levels[guest].push(room.users[x]);
							break;
					} 
				}
				return levels;
			}
		}
	},
	
	
	
	logger: function(msg) {
		if (this.config.verbose) {
			console.log(msg + "\n");
		}
		return this;
	},
	
	requires : {},
	
	resources: {
		webServer: false,
		socketIo: false,
		childSocket: false
	},
	
	init: function(options) {
		
		config = {
			verbose: options.verbose || true,
			port: options.port || 1370,
			admin: options.admin || 'soroush',
			author: 'Programming.com Team'
		}
        
		this.config = config;
		var r = this.requires;
		r['http'] = require('http');//builtin webserver package
		r['fs'] = require('fs');//file system package to handle any activity related to files
		r['socketio'] = require('socket.io');//socket.io package
		
		this.webServer();
		this.socketIo();
		//return this;
	},
	
	methods: {
		//methods you don't want to be callable from client
		privates: [
			'broadcast',
			'inArray',
			'checkPrivates',
			'checkMethod'
		],
		
		addItem: function(params, socket) {
			//type, body
			socket.emit('packet', {
				methodName: 'addItem',
				params: params
			});
		},
		
		createRoom: function(params, socket) {
			if (params.roomName && params.userName && socket.id) {
				if (App.SocketIO.rooms.methods.createRoom(params.roomName, params.userName, socket.id,  'test name...', params.isPublic || false) ) {
					socket.emit('roomCreate', {
						methodName: 'roomCreate',
						params: {msg: 'Room Created successfully', rooms: App.SocketIO.rooms.rooms}
					});
				}
			}
		},
		
		
		joinRoom: function(params, socket) {
			if (params.roomName && params.userName && socket.id) {
				if (App.SocketIO.rooms.methods.joinRoom(params.roomName, params.userName, socket.id, socket) ) {
					socket.emit('joinRoom', {
						methodName: 'joinRoom',
						params: {msg: 'User: "' + params.userName + '" Joined successfuly', rooms: App.SocketIO.rooms.rooms}
					});
				}
			}
		},
		
		leaveRoom: function(params, socket) {
			if (socket.roomName) {
				App.SocketIO.rooms.methods.leaveRoom(socket.roomName, socket);
			}
		},
		
		deleteRoom: function(params, socket) {
			if (socket.roomName) {
				//console.log( params.roomName);
				App.SocketIO.rooms.methods.deleteRoom( socket.roomName, socket );
			}
			//else
				//request is not valid...
		},
		
		getRooms: function(params, socket) {
			var pkt = this.packetCreator('getRooms', {rooms: App.SocketIO.rooms.rooms} );
			socket.emit('packet', pkt);
		},
		
		MessageAdd: function(params, socket) {
			if (socket.roomName) {
				App.SocketIO.rooms.methods.sendMessage(params.message, socket);
			}
		},
		
		/**=============<private methods>=============**/
		broadcast: function(params, socket) {
			//msg, users, escapeToSend
		},
		
		// inArray('ali', [ {user: ali, age:22} ], user) , if you
		//want to search in an array with object indexes 
		inArray: function(needle, haystack, haystackIndex, callback) {
			var length = haystack.length;
			for (var i = 0; i < length; i++)
				if ( ( haystackIndex && typeof haystack == 'object' ? haystack[i].haystackIndex : haystack[i] ) == needle) {
					if (callback) {
						callback(i);
					}
					return true;
				}
			return false;
		},
		
		checkPrivates: function(methodName) {
			var self = this;
			return self.inArray(methodName, self.privates);
		},
		
		//check the availablity of the method to call it from handler
		checkMethod: function(methodName) {
			var self = this;
			return (self[methodName] && !self.inArray(methodName, self.privates) );
		},
		
		packetCreator: function(methodName, params) {
			var ret = {
				methodName: methodName,
				params: params
			}
			return ret;
		}
		
		/**=============<End private methods>=============**/
    
	},
	
	webServer : function(){
		var self = this;
		var r = self.requires;
		var server;
		
		if (typeof self.webServer == "object") {
			self.logger("webServer() : A web server resource already exists...");
			return self;
		}
		
		if (r['http']) {
			self.logger("webServer() : Going to create a web server resource...");
			server = (r['http']).createServer(function (request, response) {		
				response.writeHead(200, {
					'Content-Type' : 'text/html'
				});
				response.end('<h1>Main Socket.io gateway</h1>');
				//response.end(response.toString());
				//console.log(request);
			}).listen(self.config.port, function(){
				self.logger("webServer() : Listening on port " + self.config.port);
			});
			self.resources.webServer = server;
		} else {
			self.logger("WebServer() : There is not any socket handler...");
		}
		//return self;
	},
	
	socketIo: function() {
		var self = this;
		var r = self.requires;
		var server;
		try {
			if (r['socketio']) {
				self.logger("socketIo(): Going to bind the socket for socketIo protocol...");
				if (self.resources.webServer === false || typeof self.resources.webServer != "object") {
					self.logger("socketIo(): There is not any valid web server resource...");
					return this;
				}
				server = self.resources.webServer;
				var socket = r['socketio'];
				
				var _socket = socket.listen(server, { log: false });
				_socket.sockets.on('connection', function(sck) {
					self.logger("socketIo(): A new connection from: " + sck.handshake.address.address);
					
					sck.on('packet', function(packet) {
						self.logger("socketIo(): A packet recieved from : " + + sck.handshake.address.address);
						self.packetHandler(packet, sck);
					});
					
					sck.on('disconnect', function() {
						self.logger("socketIo(): A client disconnected ...");
						self.packetHandler({methodName: 'leaveRoom', params:{}}, sck);
					});

					
					self.resources.childSocket = sck;
				});
				self.resources.socketIo = _socket;
			}
			return this;
		} catch(error) {
			self.logger("socketIo(): There is an error with node.js\n: " + error);
		}
	},
	
	packetHandler: function(packet, socket) {
		var self = this;
		var methodName = packet.methodName || null;
		//var socket = self.resources.socketIo;
		if ( socket != false ) {
			if ( self.methods.checkMethod(methodName) ) {
				self.methods[methodName]( packet.params || {} , socket);
			}
		} else {
			self.logger("packetHandler(): The socket resource is not valid...");
		}
	}
}

var socket = App.SocketIO.init({ verbose: true, port: 1370 });
