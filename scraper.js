const pup = require('puppeteer');
const fs = require('fs');

const url = "https://www.google.com/maps/place/Nema+Padaria+-+Visconde+de+Piraj%C3%A1/@-22.9841517,-43.2128543,15z/data=!4m6!3m5!1s0x9bd58a0cdc1487:0x4c1eb56d62eb469b!8m2!3d-22.9841517!4d-43.2128543!16s%2Fg%2F11j20tdp78?entry=ttu";

function parseAndFormatXhrResponses(XhrArray){
  const reviewDataArray = [];
  XhrArray.forEach(XhrResponseObj => {
    //console.log(XhrResponseObj.data);
    //console.log(XhrResponseObj.data)
    const trimmedResponseData = XhrResponseObj.data.slice(4);
    const responseDataArray = JSON.parse(trimmedResponseData);
    const reviewsArray = responseDataArray[2];
    reviewsArray.forEach(reviewObj => {
          const userName = reviewObj[0][1];
          const timeOfReview = reviewObj[1];
          const reviewContent = reviewObj[3];
          const reviewRating = reviewObj[4];
          const reviewLang = reviewObj[32];
          const reviewId = reviewObj[10];
          reviewDataArray.push({
            userName,
            timeOfReview,
            reviewContent,
            reviewRating,
            reviewLang,
            reviewId
          })
        });
      const JsonFormattedArray = JSON.stringify(reviewDataArray);
      // Escreva os dados em um arquivo JSON localmente
      fs.writeFileSync('browserParsedResponses.json', JsonFormattedArray, 'utf-8');
      console.log(reviewDataArray.length, " Reviews coletadas")
      console.log('Dados parseados em browserParsedResponses.json');

  });
}
async function findAndClickOnMoreReviewButton(ButtonsList){
  //Captura todos os botões da página
  const buttons = ButtonsList;
  //Itera sobre os botões da página
  if (buttons.length > 0) {
    // Itere sobre a lista de botões e faça algo com cada um deles
    for (const button of buttons) {
      //console.log(buttons.length)
      // Execute ação para cada botão, por exemplo, pegue o texto do botão
      const buttonText = await button.evaluate(element => element.textContent);
      if(buttonText.includes('Mais avaliações')){
        buttonElement = button
        console.log("Clicando no Mais avaliações",buttonText);
        await buttonElement.click();
      }
    }
  } else {
    console.log('Nenhum botão encontrado na página.');
  }
}
async function findMainReviewSection(page, mainDivSelector) {
  const divElement = await page.$(mainDivSelector);

  if (divElement) {
    console.log('Div pai encontrada');
    return divElement;
  } else {
    console.log('Div pai não encontrada');
    return null;
  }
}
async function findInnerReviewSectionAndScroll(page, innerDivElement, scrollAll = true) {
  if (innerDivElement) {
    console.log('Fazendo scroll na div filha');
    await new Promise(r => setTimeout(r, 2000));

    let previousHeight = 0;
    let currentHeight = await page.evaluate(element => element.scrollTop = element.scrollHeight, innerDivElement);

    if (scrollAll) {
      while (previousHeight !== currentHeight) {
        previousHeight = currentHeight;
        await page.evaluate(element => element.scrollTop = element.scrollHeight, innerDivElement);

        await new Promise(resolve => setTimeout(resolve, 1000));

        currentHeight = await page.evaluate(element => element.scrollTop = element.scrollHeight, innerDivElement);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        await page.evaluate(element => element.scrollTop = element.scrollHeight, innerDivElement);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } else {
    console.log('Div filha com tabindex igual a -1 não encontrada dentro da div pai.');
  }
}
function getTimeStamp(){
  const currentDate = new Date();
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();
  const seconds = currentDate.getSeconds();

  return currentDate
}

(async () =>{
  const browser = await pup.launch({
    headless:false
  });
  const page = await browser.newPage();

  //const scrollAll = false;

  const startTimeStamp = getTimeStamp();

  console.log(`Scraping iniciado em: ${startTimeStamp.getHours()}:${startTimeStamp.getMinutes()}:${startTimeStamp.getSeconds()}`)

  const xhrRequests = [];

  const xhrResponses = [];

  await page.goto(url);

  await page.setRequestInterception(true);

  // Intercepte todas as requisições de rede
  page.on('request', (request) => {
    //Captura a requisição caso ela seja do tipo xhr e possui no url '/review/listentitiesreviews'
    if (request.resourceType() === 'xhr' && request.url().includes('/review/listentitiesreviews')) {
      xhrRequests.push(request);
    }

    // Continue com a requisição
    request.continue();
  });

  // Intercepta todas as respostas
  page.on('response', async (response) => {
    // Verifica se a resposta da requisição é de um XHR e possui no url '/review/listentitiesreviews'
    if (response.request().resourceType() === 'xhr' && response.request().url().includes('/review/listentitiesreviews')) {
      const url = response.url();
      const status = response.status();
      const data = await response.text();

      // Armazena os dados da resposta no array
      xhrResponses.push({
        url,
        status,
        data,
      });
    }
  });

  const buttonsList = await page.$$('button');

  await findAndClickOnMoreReviewButton(buttonsList);

  const mainDivSelector = 'div[aria-label="Nema Padaria - Visconde de Pirajá"][role="main"]';
  const mainDivElement = await findMainReviewSection(page, mainDivSelector);

  const innerDivSelector = 'div[tabindex="-1"]';
  const innerDivElement = mainDivElement ? await mainDivElement.$(innerDivSelector) : null;

  await findInnerReviewSectionAndScroll(page, innerDivElement);
  // Feche o navegador quando terminar
  await browser.close();

  parseAndFormatXhrResponses(xhrResponses);

  const endTimeStamp = getTimeStamp();

  console.log(`Scraping finalizado em: ${endTimeStamp.getHours()}:${endTimeStamp.getMinutes()}:${endTimeStamp.getSeconds()}`);

  const scrapeTimeDiffInMinutes = Math.floor((endTimeStamp - startTimeStamp)/6000);

  console.log(`Scraping concluído em ${scrapeTimeDiffInMinutes} minutos`);

})();

