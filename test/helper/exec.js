const path = require('path');
const v8 = require('v8');

const test = require('@ava/stable');
const execa = require('execa');

const cliPath = path.resolve(__dirname, '../../cli.js');
const serialization = Number.parseInt(process.versions.node, 10) > 13 ? 'advanced' : 'json';

exports.fixture = async () => {
	const cwd = path.join(path.dirname(test.meta.file), 'fixture');
	const running = execa.node(cliPath, {
		env: {
			AVA_EMIT_RUN_STATUS_OVER_IPC: 'this is an unsupported api'
		},
		cwd,
		serialization
	});

	const stats = {
		passed: []
	};

	running.on('message', message => {
		if (serialization === 'json') {
			message = v8.deserialize(new Uint8Array(message.data));
		}

		switch (message.type) {
			case 'test-passed': {
				const {title, testFile} = message;
				stats.passed.push({title, file: path.posix.relative(cwd, testFile)});
				break;
			}

			default:
				break;
		}
	});

	try {
		return {
			stats,
			...await running
		};
	} catch (error) {
		throw Object.assign(error, {stats});
	} finally {
		stats.passed.sort((a, b) => {
			if (a.file < b.file) {
				return -1;
			}

			if (a.file > b.file) {
				return 1;
			}

			if (a.title < b.title) {
				return -1;
			}

			return 1;
		});
	}
};
