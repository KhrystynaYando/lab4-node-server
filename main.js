import { Command } from 'commander';

// 1. Налаштування командного рядка через commander
const program = new Command();

// Усуваємо конфлікт короткого прапорця -h для --host із дефолтним --help
program.helpOption('-?, --help', 'Display help for command');

program
  .requiredOption('-i, --input <path>', 'шлях до файлу даних')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .option('-o, --output <path>', 'файл для запису останньої відповіді');

program.parse(process.argv);
const options = program.opts();