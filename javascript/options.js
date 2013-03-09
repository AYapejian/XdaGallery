/*
 * Author: Ara Yapejian
 */

function ExtensionOptions() {
	this.options = {
		imagesToFetch: {
			name: 'imagesToFetch',
			value: {},
			defaultValue: 15,
			control: {},
			settingNameValue: {}
		},
		debugMode: {
			name: 'debugMode',
			value: {},
			defaultValue: false,
			control: {},
			settingNameValue: {}
		}
	};
}

/**
 * Stores the option in Chrome's online storage or locally if not available
 */
ExtensionOptions.prototype.storeOptions = function(options){

	if(options){
		// Save the settings object
		chrome.storage.sync.set({"options": options}, function(){

		});
	}
};

/**
 * Returns all options stored as an object, gets returned in callback
 */
ExtensionOptions.prototype.getOptions = function(callback){
	chrome.storage.sync.get("options", function(items){
		callback(items.options);
	});
};

ExtensionOptions.prototype.setDebug = function(enabled){

	if(enabled){
		this.options.debugMode.settingNameValue.html("On");
		this.options.debugMode.value = true;
	}else{
		this.options.debugMode.settingNameValue.html("Off");
		this.options.debugMode.value = false;
	}

	// Set the input element if it's not set
	this.options.debugMode.control.prop('checked', this.options.debugMode.value);

	this.storeOptions(this.options);
};

ExtensionOptions.prototype.setImagesToFetch = function(value){

	// There is a bug with this in Chrome that causes the slider to jump around
	// but the correct value is set.
	// TODO: Test in stable chrome version and use if it's good, otherwise
	// put in checkbox group
	this.options.imagesToFetch.control.val(parseInt(value, 10));

	this.options.imagesToFetch.value = value;
	this.options.imagesToFetch.settingNameValue.html(value);

	this.storeOptions(this.options);
};

ExtensionOptions.prototype.init = function(){
	var that = this;
	var options = that.options;

	// First fetch all the controls and html elements
	options.imagesToFetch.control = $("#imagesToFetchInput");
	options.imagesToFetch.settingNameValue = $("#imagesToFetchSettingsSection .setting-name-value");

	options.debugMode.control = $("#debugModeInput");
	options.debugMode.settingNameValue = $("#debugModeSettingSection .setting-name-value");

	// Load the settings from storage, when done set the UI up
	that.loadSettings(function(){
		that.setDebug(options.debugMode.value);
		that.setImagesToFetch(options.imagesToFetch.value);
	});

	// Setup events
	// Number of images to fetch
	options.imagesToFetch.control.change(function(){
		that.setImagesToFetch(this.value);
	});

	// Debug Mode
	options.debugMode.control.click(function(){
		that.setDebug(this.checked);
	});
};


/**
 * Fetches and sets the option value's of this instance of the class, or sets
 * to defaults if not found.  Callback is called when done.
 */
ExtensionOptions.prototype.loadSettings = function(callback){
	var that = this;
	var options = this.options;

	that.getOptions(function(fetchedOptions){

		if(fetchedOptions){
			// Get the Debug Mode Option
			if(fetchedOptions[options.debugMode.name]){
				options.debugMode.value = fetchedOptions[options.debugMode.name].value;
			} else {
				options.debugMode.value = options.debugMode.defaultValue;
			}

			// Get the Images to load options
			if(fetchedOptions[options.imagesToFetch.name]){
				options.imagesToFetch.value = fetchedOptions[options.imagesToFetch.name].value;
			} else {
				options.imagesToFetch.value = options.imagesToFetch.defaultValue;
			}
		}

		callback();
	});
};


$(function(){
	var extensionOptions = new ExtensionOptions();

	extensionOptions.init();

	if(false){
		chrome.storage.sync.clear();
	}
});
