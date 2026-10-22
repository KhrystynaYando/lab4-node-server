import http from 'node:http';
import fs from 'node:fs';
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

// Перевірка існування вхідного файлу при старті (через fs.stat або fs.access)
fs.access(options.input, fs.constants.F_OK, (err) => {
  if (err) {
    console.error(`Cannot find input file`);
    process.exit(1);
  }
});

// 2. Створення HTTP-сервера
const server = http.createServer((req, res) => {
  // Парсимо URL та шлях
  const baseUrl = `http://${options.host}:${options.port}`;
  const parsedUrl = new URL(req.url, baseUrl);
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // Перевірка маршруту: тільки /
  if (pathname !== '/') {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Маршрут не знайдено' }));
    return;
  }

  // Асинхронне читання файлу даних у стилі error-first колбеків
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

    // Зчитування параметрів запиту для Варіанта 1
    const mfoParam = searchParams.get('mfo');
    const normalParam = searchParams.get('normal');

    // Перевірка валідності параметрів (прапорці мають бути 'true' або відсутні)
    if (mfoParam !== null && mfoParam !== 'true' && mfoParam !== '') {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Некоректний параметр mfo' }));
      return;
    }
    if (normalParam !== null && normalParam !== 'true' && normalParam !== '') {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Некоректний параметр normal' }));
      return;
    }

    // Обробка та трансформація даних відповідно до Варіанта 1
    let result = rawArray.map(item => {
      // Базовий об'єкт відповіді згідно з варіантом
      const newItem = {
        name: item.SHORTNAME,
        state_code: Number(item.COD_STATE)
      };

      // Якщо передано ?mfo=true, додаємо поле mfo_code
      if (mfoParam === 'true' || mfoParam === '') {
        newItem.mfo_code = Number(item.MFO);
      }

      return newItem;
    });

    // Фільтрація, якщо задано ?normal=true
    if (normalParam === 'true' || normalParam === '') {
      result = result.filter(item => item.state_code === 1);
    }

    const jsonResponse = JSON.stringify(result, null, 2);

    // Відправляємо успішну відповідь
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.write(jsonResponse);
    res.end();

    // Якщо задано опцію --output, записуємо відповідь у файл (теж через колбек)
    if (options.output) {
      fs.writeFile(options.output, jsonResponse, 'utf8', (writeErr) => {
        if (writeErr) {
          console.error('Помилка запису у вихідний файл');
        }
      });
    }
  });
});

// Запуск сервера на заданих хості та порті
server.listen(Number(options.port), options.host, () => {
  console.log(`Сервер запущено на http://${options.host}:${options.port}`);
});