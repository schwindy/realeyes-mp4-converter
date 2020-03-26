# realeyes-mp4-converter
##### Author: Robert Schwindaman
###### GitHub: schwindy
###### Email: get.schwindy@gmail.com
##### NodeJS Version: 10.15.3

## RealEyes MP4 to HLS Converter CLI Tool

### Installation
* Install NodeJS >= v10.x (lower probably works too)
* `npm install`
* Place a .mp4 File in the Root of the `./assets` Folder (`tos-teaser.mp4`, already exists)
* Install FFMPEG On Your Computer: <http://ffmpeg.org/download.html>

### Run the Conversion Tool
1. `node index.js tos-teaser.mp4`
2. Keep in mind that the CLI expects the files to exist in the `assets` folder
3. All Output Files will be placed in a single folder, including all playlists, .ts files. 
4. Each stream quality has its own sub-folder.
5. By default, the Output Folder will be at the root of the Assets folder with a name like `tos-teaser_1585246356115`
6. To modify the name of the Output Folder, you can use the 2nd CLI argument: `node index.js tos-teaser.mp4 myFolder`

### Watch an HLS Playlist
* `cd assets/tos-teaser_1585246356115`
* `ffplay master.m3u8`

### Weird Bug
I have been unable to get my local .m3u8 playing in VLC Player, potentially due to a bug:
<https://superuser.com/questions/1379361/vlc-and-m3u8-file>. While the stream does not play locally in VLC Player, it
does play perfectly fine using `ffplay.exe` (ffmpeg player), which supports my theory. This unfortunately means that
at least on my win10 machine, I am not able to simply click the .m3u8 and have it play. According to my reading, it is
likely that if the .m3u8 was being served over HTTP(s), vs being loaded locally over disk, that VLC Player would be able
to play the stream without issue. Alternatively it could be a codec issue...

### Notes
Overall, this was one of the more difficult coding challenges that I have been given or given others during an interview
process. Nice :D I appreciated the challenge and I learned a lot. While building the solution, I wrote some extra methods
that I did not end up needing. I left these unused methods in the `StreamHelper` class to show some extra code. Also, I
was unsure about maintaining aspect ratio in the source file.

### Project Structure
* `assets`   | Asset Output Directory
* `classes`  | Application Classes
* `classes/StreamHelper.js` | File Operations Helper Class
* `index.js` | Application Router
