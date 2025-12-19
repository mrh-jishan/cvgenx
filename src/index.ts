import { startServer } from './server';
import { mainCli } from './cli';

if (process.argv.includes('--cli')) {
  mainCli();
} else {
  startServer();
}
