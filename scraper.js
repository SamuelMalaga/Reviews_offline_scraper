const pup = require('puppeteer');

const url = "https://infinite-scroll.com/demo/full-page/";

const scrapeInfiniteScrollItems = async (page, itemTargetCount) => {
  let items = [];
  while(itemTargetCount > items.length){

    items = await page.evaluate(()=>{
      const items = Array.from(document.querySelectorAll("body > div.main > div > div.article-feed > article > h2"));
      return items.map((item)=> item.innerText);
    })
    previousHeight = await page.evaluate('document.body.scrollHeight');
    await page.evaluate('window.scrollTo(0,document.body.scrollHeight)');
    await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
    await new Promise((resolve) => setTimeout(resolve,2000));
    //console.log(items);
  }

  //console.log(items);
  //console.log(items.length)
}

(async () =>{
  const browser = await pup.launch({headless: false});
  const page = await browser.newPage();
  await page.goto(url);
  //Ativa a interceptação de requests
  await page.setRequestInterception(true);
  //
  let filteredRequest = [];



  page.on('request', (request) => {
    request.continue();
  })

  page.on('response', (response)=>{
    //console.log(response.status())
    const responseUrl = response.url();
    const statusCode = response.status();

    filteredRequest.push(statusCode)

    // if(statusCode ===304) {
    //   filteredRequest.push(responseUrl);
    // }

  });




  await scrapeInfiniteScrollItems(page,5);

  console.log(filteredRequest);

  //await browser.close();
})();
