/*!
* Client.js by @aliakbarpanhi & @aghasoroush
* Copyright 2012 HyperTeanab
* http://www.apache.org/licenses/LICENSE-2.0.txt
*/
;
var App = App || {};
App.Views = App.Views || {};

App.Login = Backbone.View.extend({
	events : {
		'click button' : 'signin',
		'click .login' : 'signin',
		'click body' : 'signin',
		'click body' : 'signin',
		'click body' : 'signin',
	},
	initialize: function()
    {
		$('.input-block-level').focus();
		_.bindAll(this, 'render' , 'signin');
		
	},
	render : function(){
		console.log('aaa');
		
	},
	signin: function() {
		// Socket staf for login ...
		console.log('bbb');
		$('.form-signin').remove();
		return false;
	}
});

$(document).ready(function () {
	obj = new App.Login();
});