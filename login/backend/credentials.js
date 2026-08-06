const bcrypt = require("bcrypt");

async function run() {
  const password = "drcd@wellspringcv.com";

  const hash = await bcrypt.hash("JOnionoIOBOI309%#$", 12);

  console.log("HASH:", hash);
}

run();
