const pup = require('puppeteer');
const { pgp, db } = require('./test_pgconfig');
const fs = require('fs');

const url = "https://www.google.com/maps/place/Nema/@-22.9841517,-43.2128543,15z/data=!4m5!3m4!1s0x0:0x4c1eb56d62eb469b!8m2!3d-22.9841517!4d-43.2128543?shorturl=1"
//"https://www.google.com/maps/place/Nema+Padaria+-+Visconde+de+Piraj%C3%A1/@-22.9841517,-43.2128543,15z/data=!4m6!3m5!1s0x9bd58a0cdc1487:0x4c1eb56d62eb469b!8m2!3d-22.9841517!4d-43.2128543!16s%2Fg%2F11j20tdp78?entry=ttu";

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



  });
  console.log(reviewDataArray.length, " Reviews coletadas")
  return reviewDataArray

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
        //Pega o numero de scrolls
        const regex = /\((\d+)\)/;
        const correspondencia = regex.exec(buttonText);
        if (correspondencia && correspondencia.length > 1) {
          const numero = parseInt(correspondencia[1], 10);
          scrollN = Math.ceil(numero / 10);
          console.log("Resultado:", scrollN);
        } else {
          console.log("Nenhuma correspondência encontrada.");
        }
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
async function findInnerReviewSectionAndScroll(page, innerDivElement, totalScrolls) {
  if (innerDivElement) {
    console.log('Fazendo scroll na div filha');
    await new Promise(r => setTimeout(r, 4000));

    console.log("scrolls a serem feitas",totalScrolls)

    let previousHeight = 0;
    let currentHeight = await page.evaluate(element => element.scrollTop = element.scrollHeight, innerDivElement);

    for (let i = 0; i < totalScrolls; i++) {
      await page.evaluate(element => element.scrollTop = element.scrollHeight, innerDivElement);
      await new Promise(resolve => setTimeout(resolve, 6000));
    }
  }

  //   if (scrollAll) {
  //     while (previousHeight !== currentHeight) {
  //       previousHeight = currentHeight;
  //       await page.evaluate(element => element.scrollTop = element.scrollHeight, innerDivElement);

  //       await new Promise(resolve => setTimeout(resolve, 6000));

  //       currentHeight = await page.evaluate(element => element.scrollTop = element.scrollHeight, innerDivElement);
  //     }
  //   } else {
  //     for (let i = 0; i < 6; i++) {
  //       await page.evaluate(element => element.scrollTop = element.scrollHeight, innerDivElement);
  //       await new Promise(resolve => setTimeout(resolve, 6000));
  //     }
  //   }
  // } else {
  //   console.log('Div filha com tabindex igual a -1 não encontrada dentro da div pai.');
  // }
}
function getTimeStamp(){
  const currentDate = new Date();
  const hours = currentDate.getHours();
  const minutes = currentDate.getMinutes();
  const seconds = currentDate.getSeconds();

  return currentDate
}
async function inserReviewDataInDb(ReviewDataArray){
  let totalInseridos = 0;
  let totalIgnorados = 0;
  for (const data of ReviewDataArray) {
    const result = await db.func('insert_review_data_2', [
      data.reviewId,
      data.username,
      data.timeOfReview,
      data.reviewContent,
      data.reviewRating,
      data.reviewLang
    ]);

    if (result[0]['insert_review_data_2'].status === 'inserted') {
      totalInseridos++;
    } else if (result[0]['insert_review_data_2'].status === 'ignored') {
      totalIgnorados++;
    } else {
      console.error('Resposta inesperada da função');
    }
  }
  console.log(`Total inseridos: ${totalInseridos}`);
  console.log(`Total ignorados: ${totalIgnorados}`);
}
(async () =>{
  const browser = await pup.launch({
    headless:true
  });
  const page = await browser.newPage();

  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' });

  await page.setViewport({
    width: 642,
    height: 947,
  })

  //const scrollAll = false;

  const startTimeStamp = getTimeStamp();

  console.log(`Scraping iniciado em: ${startTimeStamp.getHours()}:${startTimeStamp.getMinutes()}:${startTimeStamp.getSeconds()}`)

  const xhrRequests = [];

  const xhrResponses = [];
  let scrollN = 0

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

  //Itera sobre os botões da página
  if (buttonsList.length > 0) {
    // Itere sobre a lista de botões e faça algo com cada um deles
    for (const button of buttonsList) {
      //console.log(buttons.length)
      // Execute ação para cada botão, por exemplo, pegue o texto do botão
      const buttonText = await button.evaluate(element => element.textContent);
      if(buttonText.includes('Mais avaliações')){
        buttonElement = button
        //Pega o numero de scrolls
        const regex = /\((\d+)\)/;
        const correspondencia = regex.exec(buttonText);
        if (correspondencia && correspondencia.length > 1) {
          const numero = parseInt(correspondencia[1], 10);
          scrollN = Math.ceil(numero / 10);

        } else {
          console.log("Nenhuma correspondência encontrada.");
        }
        //acaba de pegar o numero de scrolls

        console.log("Clicando no Mais avaliações",buttonText);
        await buttonElement.click();
      }
    }
  } else {
    console.log('Nenhum botão encontrado na página.');
  }

  const mainDivSelector = 'div[aria-label="Nema Padaria - Visconde de Pirajá"][role="main"]';
  const mainDivElement = await findMainReviewSection(page, mainDivSelector);

  const innerDivSelector = 'div[tabindex="-1"]';
  const innerDivElement = mainDivElement ? await mainDivElement.$(innerDivSelector) : null;

  await findInnerReviewSectionAndScroll(page, innerDivElement, scrollN);

  await browser.close();

  const scrapedData = parseAndFormatXhrResponses(xhrResponses);

  const endTimeStamp = getTimeStamp();

  console.log(`Scraping finalizado em: ${endTimeStamp.getHours()}:${endTimeStamp.getMinutes()}:${endTimeStamp.getSeconds()}`);

  console.log('Inserindo dados no banco de dados')
  inserReviewDataInDb(scrapedData);

})();

