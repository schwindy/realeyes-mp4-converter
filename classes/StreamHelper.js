const { exec } = require("child_process");
const fs = require('fs');
const glob = require('glob');

module.exports = class StreamHelper {
    static BuildMasterPlaylist(path, args, destination, final, save = false) {
        let val = "#EXTM3U";
        val += "\n#EXT-X-VERSION:3";

        for (const key in args) {
            const playlist = args[key];
            val += `\n#EXT-X-STREAM-INF:BANDWIDTH=${Math.round(Number(playlist.bitrate * 1024))}`;
            val += `,RESOLUTION=${playlist.resolution}`;
            val += `,FRAME-RATE=${playlist.fps}`;
            val += `\nv${key}/index.m3u8\n`
        }

        val += `\n`;

        if (save) {
            const extension = this.GetFileExtension(path);
            const name = this.GetFileName(path);
            final = path.replace(`/${final}/`, `/${destination}/`).replace(extension, "m3u8");

            const index = final.lastIndexOf(name);
            final = final.substring(0, index) + final.substring(index).replace(name, "master");
            fs.writeFileSync(final, val);
        }

        return val;
    }

    static BuildStreamPlaylist(path, args, destination, final, save = false) {
        let val = "#EXTM3U";
        val += "\n#EXT-X-VERSION:3";
        val += "\n#EXT-X-TARGETDURATION:6";
        val += "\n#EXT-X-MEDIA-SEQUENCE:0";
        val += "\n#EXT-X-DISCONTINUITY";

        for (const key in args) {
            const segment = args[key];
            val += `\n#EXTINF:${segment.duration_seconds.toFixed(6)},`;
            val += `\n${segment.file_name}`
        }

        val += `\n#EXT-X-ENDLIST\n`;

        if (save) {
            const extension = this.GetFileExtension(path);
            fs.writeFileSync(`${path.replace(`/${final}/`, `/${destination}/`).replace(extension, "m3u8")}`, val);
        }

        return val;
    }

    static CopyFile(source, destination) {
        if (!this.FileExists(source)) {
            return console.error(`Error: Unable to Copy File! (${source})| Reason: Does not exist`)
        }

        return fs.copyFileSync(source, destination);
    }

    static DeleteFile(path) {
        if (this.FileExists(path)) {
            fs.unlinkSync(path);
            return true;
        }

        return false;
    }

    static async DeleteTempFiles(name) {
        const temp = await this.Glob(`./assets/${name}*.ts`);
        for (const key in temp) {
            this.DeleteFile(temp[key]);
        }
    }

    static FileExists(path) {
        try {
            return fs.existsSync(path);
        } catch (e) {
            return false;
        }
    }

    static GetFileExtension(path) {
        const index = path.lastIndexOf(".");
        if (index === -1) {
            return false;
        }

        return path.substr(index + 1);
    }

    static GetFileName(path) {
        const indexExt = path.lastIndexOf(".");
        if (indexExt === -1) {
            return false;
        }

        const indexSlash = path.lastIndexOf("/");
        if (indexSlash === -1) {
            return path.substr(0, indexExt);
        }

        return path.substr(indexSlash + 1, indexExt - (indexSlash + 1));
    }

    static async GetVideoMetadata(path) {
        return new Promise((resolve, reject) => {
            exec(`"bin/win/ffmpeg.exe" -i ${path} -f ffmetadata`, (error, stdout, stderr) => {
                // This error is expected/intended due to no output file being specified
                if (error) {
                    let raw = error.message;
                    let index = raw.indexOf("Duration:");
                    if (index === -1) {
                        return console.error(`ExecError: Invalid Output (missing duration)`, error);
                    }

                    raw = raw.substr(index);
                    let message = raw.substr(0, raw.indexOf("\r")).split(",");
                    const duration = message[0].replace("Duration: ", "").trim();
                    const map = duration.split(":");
                    const seconds = (Number(map[0]) * 3600) + (Number(map[1]) * 60) + (Number(map[2]));

                    index = raw.indexOf("Stream #0");
                    if (index === -1) {
                        return console.error(`ExecError: Invalid Output (missing Stream #0)`, error);
                    }

                    const metadata = raw.substr(index).split(",");
                    const resolution = metadata[2].trim();
                    const fps = metadata[3].replace("fps", "").trim();
                    //console.log(metadata);

                    return resolve({
                        bitrate: Number(message[2].replace("bitrate: ", "").replace("kb/s", "").trim()),
                        duration: duration,
                        duration_seconds: seconds,
                        file_name: path.substr(path.lastIndexOf("/") + 1),
                        fps: Number(fps),
                        path: path,
                        resolution: resolution,
                        start: Number(message[1].replace("start: ", "").trim()),
                    });
                }

                return resolve(console.warn(`Warning: This is an unexpected result, an error may have occurred...`));
            });
        });
    }

    static Glob(path, args) {
        return new Promise((resolve, reject) => {
            glob(path, args, (e, files) => {
                return resolve(files);
            });
        });
    }

    static IsDirectory(path) {
        return fs.statSync(path).isDirectory();
    }

    static MakeDirectory(path) {
        try {
            return fs.mkdirSync(path, { recursive: true });
        } catch (e) {
            return false;
        }
    }

    static async TranscodeStream(path, args) {
        if (typeof args !== "object") {
            console.warn("StreamHelper::TranscodeStream() | Warning: Invalid Arguments (using defaults)");
            args = {};
        }

        return new Promise((resolve, reject) => {
            let options = ``;
            if (args.ffmpeg_args && args.ffmpeg_args.length > 0) {
                // Specify Args Line-By-Line
                for (const x in args.ffmpeg_args) {
                    options += `${args.ffmpeg_args[x]} `
                }
            } else {
                // Simple Output Defaults
                const bitrate = args.bitrate || `-b:v:0 6000k`;
                const custom = args.custom || ``;
                const format = args.format || `-f hls`;
                const gop = args.gop || `-g 60`;
                const level = args.level || ``;
                const preset = args.preset || `-flags -global_header`;
                const time = args.time || `-hls_time 6 -hls_list_size 0 -hls_init_time 6 -hls_flags split_by_time`;
                options = `${preset} ${level} ${format} ${bitrate} ${time} ${custom} ${gop}`;
            }

            exec(`"bin/win/ffmpeg.exe" -i ${path} ${options}`, async (error, stdout, stderr) => {
                if (error) {
                    return resolve(console.error(`ExecError: ${error.message}`, error));
                }

                if (!this.FileExists(args.dir_destination)) {
                    this.MakeDirectory(args.dir_destination);
                }

                const playlists = {};
                const files = await this.Glob(`./${args.dir_destination}/v*`);
                for (const key in files) {
                    const val = files[key];
                    if (this.IsDirectory(val) && playlists[key] === undefined) {
                        playlists[key] = await this.GetVideoMetadata(`${val}/index.m3u8`);
                        playlists[key].segments = {};
                        playlists[key].total_bits = 0;

                        const map = val.split("/");
                        const id = map[map.length - 1].replace("v", "");
                        const segmentFiles = await this.Glob(`./${args.dir_destination}/v${id}/sequence*.ts`);
                        for (const segmentKey in segmentFiles) {
                            const val = segmentFiles[segmentKey];
                            const segment = await this.GetVideoMetadata(val);
                            playlists[key].segments[segmentKey] = segment;
                            playlists[key].total_bits += (segment.bitrate * 1000) * segment.duration_seconds;
                        }

                        playlists[key].bitrate = (playlists[key].total_bits / playlists[key].duration_seconds) / 1000
                    }
                }

                return resolve({
                    m3u8: this.BuildMasterPlaylist(path, playlists, args.dir_destination, args.dir_final, true),
                    playlists: playlists,
                });
            });
        });
    }
};
