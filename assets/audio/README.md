# Голос голубя

`pigeon-coo.mp3` — производная от записи **Cri-du-pigeon.ogg**, автор
**Laurent Delferiere (Laurent Delferrière)**, 11 января 2022 года.

- [Оригинал и сведения автора](https://commons.wikimedia.org/wiki/File:Cri-du-pigeon.ogg)
- [Оригинальный OGG](https://upload.wikimedia.org/wikipedia/commons/4/40/Cri-du-pigeon.ogg)
- Лицензия записи и этой обработанной версии: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Обработка: сведение в моно, фильтрация шума, нормализация, снижение пиков,
  плавное начало/окончание, перекодирование в MP3 96 kbit/s.
- SHA256 исходного OGG: `bd6acf5d0f492d4f2770c8a0616192a3cdf9950e3a9d2a98134c3037b2699b96`.

Повторная генерация из корня репозитория после скачивания исходного OGG:

```sh
ffmpeg -i Cri-du-pigeon.ogg -ac 1 -ar 44100 \
  -af 'highpass=f=160,lowpass=f=3500,loudnorm=I=-18:TP=-2:LRA=7,volume=0.65,afade=t=in:d=0.03,afade=t=out:st=2.95:d=0.18' \
  -codec:a libmp3lame -b:a 96k -map_metadata -1 assets/audio/pigeon-coo.mp3
```

Игра загружает запись с локального сервера; запросов к Wikimedia во время игры нет.
