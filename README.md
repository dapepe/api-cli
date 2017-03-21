ApiCli - A framework for CLI-based applications based on Node.JS
================================================================

[![NPM](https://nodei.co/npm/api-cli.png)](https://nodei.co/npm/api-cli/)

Purpose
-------

I simply love Node.JS to create lean, CLI-based applications to access APIs in order to
automate tasks. In order to speed up the development process, I created this library as
a blueprint/framework.


Installation
------------

Simply install via NPM

```
npm install api-cli
```


API Definition
--------------

For each API, I first create a simple *API definition file*, which is usually called `api.json`.
This file contains all API classes as well as their respective methods.


```json
{
  "version": "1.0.0",
  "url": "http://...",
  "data": {
    "tasks": [
      {
        "cmd": "import",
        "method": "post",
        "route": "/",
        "description": "Import tasks",
        "param": [],
        "return": {
          "type": "array",
          "description": "List of activites [{Id, Date, Entity, Index, Meta, Type}, ...]"
        }
      },
      {
        "cmd": "export",
        "method": "get",
        "route": "/",
        "description": "Export tasks",
        "param": [
          {
            "name": "assigneduser",
            "type": "string",
            "description": "The assigend user",
            "optional": true
          },
          {
            "name": "index",
            "type": "int",
            "description": "The object ID",
            "optional": true
          },
          {
            "name": "filter",
            "type": "array",
            "description": "A filter array {search, orderby, orderasc}",
            "optional": true
          },
          {
            "name": "output",
            "type": "string",
            "description": "Output file name",
            "optional": true
          }
        ],
        "return": {
          "type": "array",
          "description": "List of activites [{Id, Date, Entity, Index, Meta, Type}, ...]"
        }
      }
    ]
  }
}

```


App Configuration
-----------------

To create a new app, you first have to include the `ApiCli` class:

```javascript
var ApiCli = require('api-cli');
```

After that, you can load the API definition from your JSON file. (But if you don't want to add
an extra file, if of course OK to simple define the API definition object right in your code):

```javascript
var apidoc = JSON.parse(
	fs.readFileSync(path.join(path.dirname(fs.realpathSync(__filename)), '..', 'lib', 'api.json'))
);
```

After that, you create a new class instance, where you can specify your properties and methods.

```javascript
var app = new ApiCli({
```

Finally, you can invoce the `run` method in order to execute your application:

```javascript
app.run();
```

A complete example would look like this:

```javascript
var path   = require('path');
var fs     = require('fs');
var ApiCli = require('api-cli');

var apidoc = JSON.parse(
	fs.readFileSync(path.join(path.dirname(fs.realpathSync(__filename)), '..', 'lib', 'api.json'))
);

var app = new ApiCli({
	AppName      : 'api-cli Client',         // {string} Application name
	AppBin       : 'api-cli',                // {string} Application executable
	AppVersion   : '1.0.0',                  // {string} The required API version

	ApiDoc       : apidoc,                   // {object} The API definition object
	ApiName      : 'tasks',                  // {string} The API name (e.g. project, user, etc.)
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
		}
	],
	CliShortcuts: {
		'c': ['--config'],
		'h': ['--help'],
		'f': ['--file']
	},
	evalResponse: function(err, response, body) {
		if (err) throw err;

		console.log('Do something with the API result...', body);
	}
});
app.run();
```


Methods and Properties
----------------------

The `ApiCli` class has various properties and classes, with those marked _public_ can be specified
upon initialization (see sample above).

|   Parameter   |     Type    | Public |                         Description                          |
| ------------- | ----------- | ------ | ------------------------------------------------------------ |
| AppName       | string      | Yes    | The name of the applicaiton                                  |
| AppBin        | string      | Yes    | The filename for the binary executable                       |
| AppVersion    | string      | Yes    | The app version                                              |
| ApiDoc        | object      | Yes    | The API documentation object                                 |
| ApiName       | string/null | Yes    | The name of the API (default: null)                          |
| ApiDefinition | object      | No     | Contains the API definition object, after initialization     |
| CliParams     | object      | Yes    | Specifies the default CLI parameters                         |
| CliShortcuts  | object      | Yes    | Specifies shortscut parameters                               |
| CliOptions    | object      | No     | Contains the user's CLI input options                        |
| evalResponse  | function    | Yes    | Function called to evaluate the HTTP response                |
| execute       | function    | Yes    | Function called after initialization to execute the API task |

The execute function by default simply referrs to the `_`


Requirements
------------

Node.js with NPM (Tested with Node Version 0.10.22)

* [request](https://www.npmjs.org/package/request): ~2.27.0
* [nopt](https://www.npmjs.org/package/nopt): ~2.1.2
* [read](https://www.npmjs.org/package/read): ~1.0.5
* [cli-table](https://www.npmjs.org/package/cli-table): ~0.2.0
* [prettyjson](https://www.npmjs.org/package/prettyjson): ~0.10.0


License
-------
This work is licensed under the GNU Lesser General Public License (LGPL). You may also get a copy of the GNU Lesser General Public License from http://www.gnu.org/licenses/lgpl.txt.
