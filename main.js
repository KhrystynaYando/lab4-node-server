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
import http from 'node:http';

// 2. Створення базової структури HTTP-сервера
const server = http.createServer((req, res) => {
  const baseUrl = `http://${options.host}:${options.port}`;
  const parsedUrl = new URL(req.url, baseUrl);
  const pathname = parsedUrl.pathname;

  // Базова перевірка маршруту (згідно з вимогами, дані віддаються за маршрутом /)[cite: 11]
  if (pathname !== '/') {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Маршрут не знайдено' }));
    return;
  }

  // Тимчасова відповідь для перевірки сервера
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ message: 'Сервер працює' }));
});

// Запуск сервера на заданих хості та порті[cite: 11]
server.listen(Number(options.port), options.host, () => {
  console.log(`Сервер запущено на http://${options.host}:${options.port}`);
});