var path   = require('path');
var fs     = require('fs');
var yaml   = require('js-yaml');
var ApiCli = require(path.join(path.dirname(fs.realpathSync(__filename)), '..', 'lib', 'api-cli.js'));

var doc = JSON.parse(
	fs.readFileSync(path.join(path.dirname(fs.realpathSync(__filename)), '..', 'lib', 'api.json'))
);

var app = new ApiCli({
	AppName      : 'api-cli Client',         // {string} Application name
	AppBin       : 'api-cli',                // {string} Application executable
	AppVersion   : '1.0.0',                  // {string} The required API version

	ApiDoc       : doc,                      // {object} The API definition object
	ApiName      : null,                     // {string} The API name (e.g. project, user, etc.)
	ApiTask      : null,                     // {string} The API task
	ApiParams    : null,                     // {array}  Additional CLI parameters
	ApiDefinition: null,                     // {object} API definition

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
	CliInputs: {},
	CliShortcuts: {
		'c': ['--config'],
		'h': ['--help'],
		'f': ['--file']
	},
	evalResponse: function(err, response, body) {
		if (err) throw err;

	}
});
app.run();

