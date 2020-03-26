const StreamHelper = require("./classes/StreamHelper.js");

/**
 * @Configuration
 *
 * DIR_FINAL | The folder in the root of the Project where finalized assets will be placed
 * DIR_TEMP  | The folder in the root of the Project where temporary assets will be placed during operations
 * VERBOSE   | A boolean indicator to Enable/Disable Verbose Logging
 *
 */
const DIR_FINAL = "assets";
const VERBOSE = true;

/**
 * MP4 HLS Converter Command Line Args
 *
 * @cli Arguments
 * argv[2] | source        | The relative path of the Source MP4 File that should be converted to HLS
 * argv[3] | destination   | The folder name where all assets will be placed | @optional | @default: Unix Timestamp (ms)
 * argv[4] | targetSegment | The target length for each HLS segment (in seconds)
 *
 * @example Command: `node index.js tos-teaser.mp4 tos-teaser`
 */
const source = process.argv[2] || "";
const name = StreamHelper.GetFileName(source);
const destination = `${DIR_FINAL}/${(process.argv[3] || `${name}_${Date.now()}`)}`;
const targetSegment = process.argv[4] || `6`;
const path = `./${DIR_FINAL}/${source}`;

if (source === "") {
    return console.error(`Error: Invalid Source File (${source}) | Reason: Source is missing!`);
}

if (!StreamHelper.FileExists(path)) {
    return console.error(`Error: Invalid Source File Path (${path}) | Reason: File does not exist!`);
}

Start();

async function Start(t = Date.now()) {
    console.log(`Initializing MP4 to HLS Conversion Tool! (by Robert Schwindaman)\n`);
    console.log(`Project Directory:`, __dirname);
    console.log(`Source File:`, source);
    console.log(`File Name:`, name);
    console.log(`File Extension:`, StreamHelper.GetFileExtension(source));
    console.log(`Target Directory: ${destination}`);
    StreamHelper.MakeDirectory(destination);

    const result = await StreamHelper.TranscodeStream(path, {
        dir_destination: destination,
        dir_final: DIR_FINAL,
        ffmpeg_args: [
            `-flags -global_header -preset slow -g 60 -sc_threshold 0`,
            `-map 0:0 -map 0:1`,
            `-map 0:0 -map 0:1`,
            `-map 0:0 -map 0:1`,
            `-map 0:0 -map 0:1`,
            `-map 0:0 -map 0:1`,
            `-map 0:0 -map 0:1`,
            `-s:v:0 1920x1080 -c:v:0 libx264 -b:v:0 6000k`,
            `-s:v:1 1920x1080 -c:v:1 libx264 -b:v:1 4000k`,
            `-s:v:2 1280x720 -c:v:2 libx264 -b:v:2 3000k`,
            `-s:v:3 1280x720 -c:v:3 libx264 -b:v:3 2000k`,
            `-s:v:4 960x540 -c:v:4 libx264 -b:v:4 1500k`,
            `-s:v:5 640x360 -c:v:5 libx264 -b:v:5 1100k`,
            `-c:a copy -var_stream_map "v:0,a:0 v:1,a:1, v:2,a:2, v:3,a:3, v:4,a:4, v:5,a:5"`,
            `-master_pl_name master.m3u8 -f hls -hls_time ${targetSegment} `,
            `-hls_init_time 0 -hls_list_size 0 -hls_flags split_by_time -hls_segment_filename`,
            `"${destination}/v%v/sequence_%d.ts"`,
            `${destination}/v%v/index.m3u8`,
        ],
    });

    console.log(`Task Complete! Elapsed (s): ${(Date.now() - t) / 1000}`);
    if (VERBOSE) {
        console.log(`Task Result:`, result);
    }
}
