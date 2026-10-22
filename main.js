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

 import fs from 'node:fs';

// 3. Асинхронне читання файлу даних у стилі error-first колбеків[cite: 10, 11]
  fs.readFile(options.input, 'utf8', (readErr, fileData) => {
    if (readErr) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Помилка читання файлу даних' }));
      return;
    }

    let rawArray;
    try {
      rawArray = JSON.parse(fileData);
    } catch (parseErr) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Пошкоджений формат JSON у файлі' }));
      return;
    }

    // Тимчасова перевірка успішного читання файлу
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ totalRecords: rawArray.length }));
  });