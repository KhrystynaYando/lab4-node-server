import http from 'node:http';
import fs from 'node:fs';
import { Command } from 'commander';

// Налаштування командного рядка через commander
const program = new Command();

//щоб уникнути конфлікту короткого прапорця -h для --host із дефолтним --help
program.helpOption('-?, --help', 'Display help for command');

program
  .requiredOption('-i, --input <path>', 'шлях до файлу даних') //шлях до вхідного файлу з даними
  .requiredOption('-h, --host <address>', 'адреса сервера') // IP-адреса, на якій запускається сервер
  .requiredOption('-p, --port <number>', 'порт сервера') // порт сервера
  .option('-o, --output <path>', 'файл для запису останньої відповіді');// необов'язковий параметр, якщо не вказано, то відповідь не записується у файл

program.parse(process.argv);// зчитує та аналізує аргументи, які ми передаємочерез термінал
const options = program.opts(); // отримуємо об'єкт із опціями командного рядка

// Перевірка існування вхідного файлу при старті
fs.access(options.input, fs.constants.F_OK, (err) => { //fs.access-асинхронна функція перевірки доступності файлу, fs.constants.F_OK - перевірка на існування файлу
  if (err) {
    console.error(`Cannot find input file`);
    process.exit(1);
  }
});

// 2. Створення HTTP-сервера
const server = http.createServer((req, res) => { //Колбек-функція всередині приймає два об'єкти(request — вхідний запит від клієнта) та (response — об'єкт для відправки відповіді). 
  const baseUrl = `http://${options.host}:${options.port}`;
  const parsedUrl = new URL(req.url, baseUrl);
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // Перевірка маршруту
  if (pathname !== '/') { //якщо користувач звернувся не на головну сторінку (/), сервер повертає статус 404 Not Found
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Маршрут не знайдено' }));
    return;
  }

  // 3. Асинхронне читання файлу даних у стилі error-first колбеків
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

// Перетворення даних у потрібний формат
let result = rawArray.map(item => {
  const newItem = {
    name: item.SHORTNAME,
    state_code: Number(item.COD_STATE)
  };

  // Додаємо МФО, тільки якщо mfo=true
  if (mfoParam === 'true') {
    newItem.mfo_code = Number(item.MFO);
  }

  return newItem;
});

// Фільтруємо банки, тільки якщо normal=true
if (normalParam === 'true') {
  result = result.filter(item => item.state_code === 1);
}

   const jsonResponse = JSON.stringify(result, null, 2);

// Функція для відправлення успішної відповіді клієнту
const sendResponse = () => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(jsonResponse);
};

// Якщо користувач вказав файл для запису відповіді
if (options.output) {
  fs.writeFile(options.output, jsonResponse, 'utf8', (writeErr) => {

    // Якщо під час запису виникла помилка
    if (writeErr) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Помилка запису у вихідний файл' }));
      return;
    }

    // Якщо запис успішний, надсилаємо відповідь
    sendResponse();
  });

} else {
  // Якщо --output не вказано, одразу надсилаємо відповідь
  sendResponse();
}
  });
});

// Запуск сервера на заданих хості та порті
server.listen(Number(options.port), options.host, () => {
  console.log(`Сервер запущено на http://${options.host}:${options.port}`);
});