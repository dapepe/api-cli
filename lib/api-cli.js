// Load libraries
var querystring = require('querystring'),
    request     = require('request'),
    path        = require('path'),
    fs          = require('fs'),
    util        = require('util'),
    nopt        = require('nopt'),
    read        = require('read'),
    Table       = require('cli-table'),
	yaml        = require('js-yaml'),
    Stream      = require('stream').Stream;

module.exports = function(options) {
	var defaultOptions = {
		AppName      : 'api-cli Client',         // {string} Application name
		AppBin       : 'api-cli',                // {string} Application executable
		AppVersion   : '0.1.0',                  // {string} The required API version
		AppUsage     : null,                     // {string} Usage infos (for the help info)

		ApiDoc       : {},                       // {object} The API definition object
		ApiName      : null,                     // {string} The API name (e.g. project, user, etc.)
		ApiTask      : null,                     // {string} The API task
		ApiParams    : [],                       // {array}  Additional CLI parameters
		ApiDefinition: {},                       // {object} API definition

		CliParams: [                             // {array}  Default CLI options and short hands
			{
				'name': 'help',
				'type': 'boolean',
				'description': 'Show help'
			},
			{
				'name': 'config',
				'type': 'string',
				'description': 'Configuration file'
			},
			{
				'name': 'username',
				'type': 'string',
				'description': 'User name',
				'input': 'text'
			},
			{
				'name': 'password',
				'type': 'string',
				'description': 'User password',
				'input': 'hidden'
			},
			{
				'name': 'host',
				'type': 'string',
				'description': 'ZeyOS instance ID or host URL'
			},
			{
				'name': 'file',
				'type': 'string',
				'description': 'Output filename'
			}
		],
		CliInputs: {},                        // {object} List of options that can be added through user input
		CliShortcuts: {                       // {object} Shortcut options
			'c': ['--config'],
			'h': ['--help'],
			'f': ['--file']
		},
		CliOptions: {},                       // {object} List of all CLI options, after initialization
		CliArgs: []                         // {array}  List of remaining CLI options
	};


	/**
	 * Execute the CLI script
	 */
	this.run = function() {
		this._initOptions();
	}

	/**
	 * Initialize an option type
	 *
	 * @param  {mixed} t
	 * @return {mixed}
	 */
	this._getParamType = function(t) {
		if (t == undefined)
			return String;

		if (typeof t != 'string')
			return t;

		switch (t.toLowerCase()) {
			case 'string':
				return String;
			case 'bool':
			case 'boolean':
				return Boolean;
			case 'int':
			case 'integer':
			case 'num':
			case 'numeric':
			case 'float':
				return Number;
			case 'object':
				return Object;
			case 'array':
				return Array;
			default:
				return String;
		}
	}

	/**
	 * Get the API options from the DOC object
	 *
	 * @param  {string} api
	 * @param  {string} task
	 * @return {object}
	 */
	this._getApiOptions = function(api, task) {
		try {
			if (this.ApiDoc.data == null)
				throw 'Invalid API documentation file.';

			if (this.ApiDoc.data[api] == null)
				throw 'Unknown API: ' + api;

			var opts = false;
			this.ApiDoc.data[api].forEach(function(cmd) {
				if (cmd.cmd == task) {
					opts = cmd;
					return;
				}
			});

			if (opts)
				return opts;

			throw 'Unknown task: ' + api + ' -> ' + task;
		} catch (e) {
			console.log();
			console.log('Failed to initialize API options - ' + e);
			console.log('Use "--help" to get general help and a list of all API classes');
			console.log('Use "--help {API}" to get a list of all API tasks.')
			return false;
		}
	}

	/**
	 * Build the option list from the definition object
	 *
	 * @param {array}
	 * @return {object} Parameter list
	 */
	this._getParamList = function(opts) {
		var r = {};
		opts.forEach(function(opt) {
			if (opt.name == null)
				return;

			r[opt.name] = this._getParamType(opt['type']);
		}.bind(this));

		return r;
	}

	/**
	 * Initialize the CLI Options
	 *
	 * @return void
	 */
	this._initOptions = function() {
		try {
			if (!(this.ApiDoc instanceof Object) || !(this.ApiDoc instanceof Object))
				throw 'Invalid API definition';

			var argsDefault = this._getParamList(this.CliParams);
			var opts  = nopt(argsDefault, this.CliShortcuts, process.argv, 2);

			if (this.ApiName == null)
				this.ApiName = opts.argv.remain.shift();

			this.ApiTask = opts.argv.remain.shift();

			this.CliArgs = opts.argv.remain;

			// Display CLI help
			if (opts.help) {
				this._showCliHelp();
				return;
			}

			var args = {},
			    opts = {};

			// Read the options from a config file
			if (this.AppConfig != false && !opts.config && fs.existsSync(this.AppConfig))
				opts.config = this.AppConfig;

			if (this.AppNoApi !== true) {
				if (typeof this.ApiName != 'string')
					throw 'No API specified';
				if (typeof this.ApiTask != 'string')
					throw 'No task specified';

				// Task definition
				this.ApiDefinition = this._getApiOptions(this.ApiName, this.ApiTask);
				this.ApiParams     = this.ApiDefinition.param == null ? [] : this.ApiDefinition.param;

				var argsApi = this._getParamList(this.ApiParams);
				// Merge the required configs
				Object.keys(argsApi).forEach(function(key) {
					args[key] = argsApi[key];
				});
			}

			Object.keys(argsDefault).forEach(function(key) {
				args[key] = argsDefault[key];
			});

			// Validate the options
			var missing = [];
			var userOpts = nopt(args, this.CliShortcuts, process.argv, 2);
			Object.keys(userOpts).forEach(function(key) {
				opts[key] = userOpts[key];
			});

			// Load the config
			if (opts.config) {
				if (!fs.existsSync(opts.config)) {
					throw 'Config file does not exist: ' + opts.config;
				}

				var config;
				switch (path.extname(opts.config).toLowerCase()) {
					case '.json':
						config = JSON.parse(fs.readFileSync(opts.config, 'utf8'));
						break;
					case '.yml':
					case '.yaml':
						config = yaml.safeLoad(fs.readFileSync(opts.config, 'utf8'));
						break;
					default:
						throw 'Unknown file extension: ' + path.extname(opts.config);
						break;
				}

				if (typeof opts != 'object') {
					throw 'Invalid configuration file: Object expected!';
				}

				Object.assign(opts, config);
			}

			[this.CliParams, this.ApiParams].forEach(function(d) {
				d.forEach(function(p) {
					if (opts[p.name] != null)
						this.CliOptions[p.name] = opts[p.name];
					else if (p.optional == false && p.input == null)
						missing.push(p);

					if (p.input != null)
						this.CliInputs[p.name] = p;
				}.bind(this));
			}.bind(this))

			if (missing.length > 0) {
				this._listParams('The following parameters are missing', missing);
				console.log();
				console.log('Type --help to see more details')
				return;
			}

			if (this.ApiDefinition.method == null)
				this.ApiDefinition.method = 'POST';

			this.ApiDefinition.method = this.ApiDefinition.method.toUpperCase();
			switch (this.ApiDefinition.method) {
				case 'GET':
				case 'PUT':
				case 'DELETE':
					break;
				default:
					this.ApiDefinition.method = 'POST';
					break;
			}

			this._preExecute();

		} catch (e) {
			console.log();
			console.log('Failed to initialize options - ' + e);
			console.log();
			this._showCliHelp();
		}
	}

	/**
   * Gets an option
   *
	 * @param key
	 * @param def (Default: null)
	 */
	this.option = function(key, def) {
		return (typeof this.CliOptions[key] == 'undefined')
			? (typeof def == 'undefined' ? null : def)
			: this.CliOptions[key];
	}

	/**
	 * Checks CLI options prior to execution
	 *
	 * @private
	 */
	this._preExecute = function() {
		// Promt the user for inputs
		for (var key in this.CliInputs) {
			if (this.CliOptions[key] == null) {
				read({prompt: this.CliInputs[key].description + ' <' + key + '>: ', 'silent': this.CliInputs[key].input == 'hidden'}, function(er, input) {
					this.CliOptions[key] = input;
					this._preExecute();
				}.bind(this));
				return;
			}
		}

		this.execute();
	}

	/**
	 * Execute the CLI script (usese execRequest by default)
	 */
	this.execute = function() {
		this._execRequest();
	}

	/**
	 * Execute the API request
	 *
	 * @private
	 */
	this._execRequest = function() {
		try {
			if (typeof this.ApiDoc.url != 'string')
				throw 'Invalid request URL';

			if (typeof this.ApiDefinition.route == 'string')
				this.ApiDoc.url += this.ApiDefinition.route;

			// Initialize the file
			var outputFile = false;
			if (this.CliOptions.outputfile) {
				outputFile = this.CliOptions.file;
				delete this.CliOptions.file;
			}

			// Initialize the call parameters
			var callparams = {
				'uri':    this.ApiDoc.url,
				'method': this.ApiDefinition.method
			};
			switch (this.ApiDefinition.method) {
				case 'GET':
				case 'DELETE':
					var params = querystring.stringify(this.CliOptions);
					if (params != '')
						callparams.uri += '?' + params;
					break;
				case 'POST':
				case 'PUT':
					callparams.form = this.CliOptions;
					break;
			}

			// Perform the HTTP request
			request(callparams, function(err, response, body) {
				if (err) throw err;

				if (outputFile) {
					fs.writeFile(outputFile, body, function (err) {
					if (err) throw err;
						console.log('Output written to ' + outputFile);
					});
				} else {
					this.evalResponse(err, response, body);
				}
			}.bind(this));
		} catch(e) {
			console.log('Failed to execute API call - ' + e);
		}
	}

	/**
	 * Evaluate the HTTP response
	 *
	 * @param  {string} err      Error message
	 * @param  {string} response Response code
	 * @param  {string] body     Response body
	 */
	this.evalResponse = function(err, response, body) {
		console.log(err, response, body);
	}

	/**
	 * Displays a parameter list
	 *
	 * @param  {string} title
	 * @param  {array} params
	 */
	this._listParams = function(title, params) {
		console.log();
		console.log(title+':');
		console.log();
		var len = 0;
		var lines = [];
		params.forEach(function(opt) {
			var l = opt.name + (opt.optional === false ? '*' : '') + ' {' + opt['type'] + '}';
			if (l.length > len)
				len = l.length;
			lines.push([l, opt.description]);
		});
		lines.forEach(function(line) {
			console.log('	' + line[0] + Array(len - line[0].length + 3).join(' ') + ': ' + line[1]);
		});
	}

	/**
	 * Display the help dialog
	 *
	 * @return void
	 */
	this._showCliHelp = function() {
		console.log(this.AppName + ' (Version: ' + this.AppVersion + ')');
		console.log();
		console.log('USAGE:');
		console.log();
		if (this.AppUsage == null)
			console.log('	' + this.AppBin + ' [OPTIONS] API TASK');
		else
			console.log('	' + this.AppUsage);

		if (this.ApiName == null && this.ApiTask != null) {
			console.log();
			this._showApiHelp();
			return;
		} else if (this.ApiName != null && this.ApiTask != null) {
			var def = this._getApiOptions(this.ApiName, this.ApiTask);
			if (def) {
				console.log();
				console.log('Help for ' + this.ApiName + ' -> ' + this.ApiTask);
				console.log();
				if (def.description != null)
					console.log('	' + def.description);
				if (def.method != null)
					console.log('	Request method: ' + def.method);
				if (def['return'] != null)
					console.log('	Return {' + def['return']['type'] + '} ' + (def['return']['description'] != null ? def['return']['description'] : ''))
				if (def.param != null)
					this._listParams('Call parameters', def.param)
			}
			return;
		}

		this._listParams('General parameters', this.CliParams);

		console.log();
		this._showApiHelp();
	}

	/**
	 * Displays API help
	 *
	 * @private
	 */
	this._showApiHelp = function() {
		if (this.ApiName != null && this.ApiDoc.data[this.ApiName] == null) {
			console.log('Unknown API: ' + this.ApiName);
			console.log();
			this.ApiName = null;
		}

		if (!(this.ApiDoc instanceof Object) || !(this.ApiDoc.data instanceof Object))
			return;

		if (this.ApiName == null) {
			console.log('Available API classes:');
			Object.keys(this.ApiDoc.data).forEach(function(a) {
				console.log('	* ' + a);
			});
			return;
		}

		console.log('Showing API tasks for: ' + this.ApiName);
		console.log();
		var table = new Table({
			head: ['Task', 'Method', 'Description', 'Returns']
		});

		this.ApiDoc.data[this.ApiName].forEach(function(cmd) {
			table.push([
				cmd.cmd,
				(cmd.method != null ? cmd.method : 'any').toUpperCase(),
				cmd.description != null ? cmd.description : '-',
				cmd['return'] != null && cmd['return']['type'] != null ? cmd['return']['type'] : '-'
			]);
		});
		console.log(table.toString());
	}

	// Initialize the options and overwrite local methods
	var t = [defaultOptions, options];
	t.forEach(function(opts) {
		Object.keys(opts).forEach(function(key) {
			if (key.substr(0, 1) != '_')
				this[key] = opts[key];
		}.bind(this))
	}.bind(this));
};
