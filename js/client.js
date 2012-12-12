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
		'click .login' : 'signin',
	},
	initialize: function()
    {
		$('.input-block-level').focus();
		_.bindAll(this, 'render' , 'signin');
	},
	render : function(){
		
	},
	signin: function() {
		// Socket staf for login ...
		$('.form-signin').remove();
		return false;
	}
});

$(document).ready(function () {
	obj = new App.Login({el:$('.container')});
});