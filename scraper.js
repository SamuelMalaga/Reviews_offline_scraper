const pup = require('puppeteer');
const fs = require('fs');

const url = "https://www.google.com/maps/place/Nema+Padaria+-+Visconde+de+Piraj%C3%A1/@-22.9841517,-43.2128543,15z/data=!4m6!3m5!1s0x9bd58a0cdc1487:0x4c1eb56d62eb469b!8m2!3d-22.9841517!4d-43.2128543!16s%2Fg%2F11j20tdp78?entry=ttu";

function parseAndFormatXhrResponses(XhrArray){
  const reviewDataArray = [];
  //console.log(XhrArray);
  XhrArray.forEach(XhrResponseObj => {
    console.log(XhrResponseObj.data);
    console.log(XhrResponseObj.data)
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
      console.log('Dados parseados em browserParsedResponses.json');

  });
  // for(XhrResponseObj in XhrArray){
  //   console.log(XhrResponseObj.data)
  //   const trimmedResponseData = XhrResponseObj.data.slice(4);
  //   const responseDataArray = JSON.parse(trimmedResponseData);
  //   const reviewsArray = responseDataArray[2];
  //   reviewsArray.forEach(reviewObj => {
  //     const userName = reviewObj[0][1];
  //     const timeOfReview = reviewObj[1];
  //     const reviewContent = reviewObj[3];
  //     const reviewRating = reviewObj[4];
  //     const reviewLang = reviewObj[32];
  //     const reviewId = reviewObj[10];
  //     reviewDataArray.push({
  //       userName,
  //       timeOfReview,
  //       reviewContent,
  //       reviewRating,
  //       reviewLang,
  //       reviewId
  //     })
  //   });
  //   const JsonFormattedArray = JSON.stringify(reviewDataArray);
  //   // Escreva os dados em um arquivo JSON localmente
  //   fs.writeFileSync('browserParsedResponses.json', JsonFormattedArray, 'utf-8');
  //   console.log('Dados parseados em browserParsedResponses.json');
  // }
}

(async () =>{
  const browser = await pup.launch({
    headless: false
  });
  const page = await browser.newPage();

  const scrollAll = false;

  const xhrRequests = [];

  const xhrResponses = [];

  await page.goto(url);

  await page.setRequestInterception(true);

  // Intercepte todas as requisições de rede
  page.on('request', (request) => {
    if (request.resourceType() === 'xhr' && request.url().includes('/review/listentitiesreviews')) {
      // Esta é uma requisição Fetch (XHR)
      xhrRequests.push(request);
    }

    // Continue com a requisição
    request.continue();
  });

  // Intercepta todas as respostas
  page.on('response', async (response) => {
    // Verifique se a resposta é de um XHR
    if (response.request().resourceType() === 'xhr' && response.request().url().includes('/review/listentitiesreviews')) {
      const url = response.url();
      const status = response.status();
      const data = await response.text(); // ou response.json() se for JSON

      // Armazene os dados da resposta no array
      xhrResponses.push({
        url,
        status,
        data,
      });
    }
  });

  //navega até a aba de mais avaliações
  const buttons = await page.$$('button');
  //Encontra o mais avaliações e clica nele
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

  //Navega até a seção dos comentários
  const divSelector = 'div[aria-label="Nema Padaria - Visconde de Pirajá"][role="main"]';
  const divElement = await page.$(divSelector);
  if(divElement){
    console.log('div para scroll encontrada');

    const divFilhaSelector = 'div[tabindex="-1"]';

    const divFilhaElement = await divElement.$(divFilhaSelector);

    if (divFilhaElement) {
      console.log('Div filha encontrada');
      await new Promise(r => setTimeout(r, 2000));


      let previousHeight = 0;
      let currentHeight = await page.evaluate(element => element.scrollTop = element.scrollHeight, divFilhaElement);

      if(scrollAll){
        while (previousHeight !== currentHeight) {
          previousHeight = currentHeight;
          await page.evaluate(element => element.scrollTop = element.scrollHeight, divFilhaElement);

          await new Promise(resolve => setTimeout(resolve, 1000));

          currentHeight = await page.evaluate(element => element.scrollTop = element.scrollHeight, divFilhaElement);
        }
      } else{
        for (let i = 0; i < 2; i++) {
            await page.evaluate(element => element.scrollTop = element.scrollHeight, divFilhaElement);
            // Aguarde um pequeno intervalo entre as rolagens (opcional)
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
      }



    } else {
      console.log('Div filha com tabindex igual a -1 não encontrada dentro da div pai.');
    }



  } else {
    console.log('div não encontrada')
  }
  // Feche o navegador quando terminar
  await browser.close();

  //Seção para salvar os dados de resposta em um json e estudar como fazer o parse
  // // Escreva os dados em um arquivo JSON localmente
  // const jsonData = JSON.stringify(xhrResponses, null, 2); // Formate com 2 espaços de indentação
  // fs.writeFileSync('xhr_responses.json', jsonData, 'utf-8');

  // console.log('Dados das respostas XHR foram escritos em xhr_responses.json');
  parseAndFormatXhrResponses(xhrResponses);
  console.log('Scraping concluído')

})();

