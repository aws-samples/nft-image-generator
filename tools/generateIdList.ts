// JSON形式でIDのリストを1000000件作成する
// {[{id: "A001"}, {id: "A002"}]}

import * as yargs from "yargs";
import { writeFileSync } from "fs";
import * as path from 'path'

const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'brown', 'gray', 'silver', 'gold', 'cyan', 'magenta', 'olive', 'maroon', 'navy', 'lime', 'turquoise', 'lavender', 'violet', 'indigo', 'teal', 'crimson', 'salmon', 'plum', 'tan', 'khaki', 'amber', 'mahogany', 'chestnut', 'hazel', 'beige', 'azure', 'ivory', 'aquamarine', 'charcoal', 'periwinkle', 'burgundy', 'fuchsia', 'emerald', 'ruby', 'sapphire', 'mustard', 'rust', 'peach', 'mint', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'white', 'black', 'brown', 'gray', 'silver', 'gold', 'cyan', 'magenta', 'olive', 'maroon', 'navy', 'lime', 'turquoise', 'lavender', 'violet', 'indigo', 'teal', 'crimson', 'salmon', 'plum', 'tan', 'khaki', 'amber', 'mahogany', 'chestnut', 'hazel', 'beige', 'azure', 'ivory', 'aquamarine', 'charcoal', 'periwinkle', 'burgundy', 'fuchsia', 'emerald', 'ruby', 'sapphire', 'mustard', 'rust', 'peach', 'mint', 'cerulean', 'vermilion', 'sepia', 'scarlet', 'ultramarine', 'carmine', 'taupe', 'puce', 'persimmon', 'celadon', 'ecru', 'flax', 'gunmetal', 'zinnwaldite', 'falu', 'wenge', 'fulvous', 'xanthic', 'isabelline', 'glaucous', 'erin', 'eerie', 'fuligin', 'amaranth', 'cinnabar', 'coquelicot', 'verdigris', 'viridian', 'gamboge', 'cerise', 'carmine', 'ochre', 'saffron', 'ultramarine', 'sangria', 'copper', 'terracotta'];

const argv = yargs(process.argv.slice(2))
  .options({
    rank: {
      description: "rank of NFT.",
      demandOption: true,
      requiresArg: true
    },
    number: {
      description: "number of shop list",
      demandOption: true,
      requiresArg: true,
    }
  }).parseSync();

const idList = new Array(argv.number).fill(0).map((_, i) => (
  {
    shopId: `A${i + 1}`,
    rank: argv.rank,
    inputBucketName: "111122223333-aa-example-1-input-image-bucket",
    inputKeyName: "image.jpeg",
    model: "stability.stable-diffusion-xl-v0",
    prompt: `hair color is ${colors[Math.ceil( Math.random()*colors.length) ]}, backglound color is ${colors[Math.ceil( Math.random()*colors.length) ]}`
  }
));
writeFileSync(path.join(__dirname, `${argv.rank}.json`), JSON.stringify(idList));
console.log(`${argv.rank}.json is created.`);
