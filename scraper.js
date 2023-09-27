const pup = require('puppeteer');

const url = "https://www.google.com/maps/place/Nema+Padaria+-+Visconde+de+Piraj%C3%A1/@-22.9841517,-43.2128543,15z/data=!4m6!3m5!1s0x9bd58a0cdc1487:0x4c1eb56d62eb469b!8m2!3d-22.9841517!4d-43.2128543!16s%2Fg%2F11j20tdp78?entry=ttu";

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
  const browser = await pup.launch({
    headless: false
  });
  const page = await browser.newPage();


  await page.goto(url);

  // Use page.$$ para encontrar todos os botões na página
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

  const divSelector = 'div[aria-label="Nema Padaria - Visconde de Pirajá"][role="main"]';
  //Use page.$ para encontrar a div específica
  const divElement = await page.$(divSelector);
  if(divElement){
    console.log('div para scroll encontrada');

    const divFilhaSelector = 'div[tabindex="-1"]';

    const divFilhaElement = await divElement.$(divFilhaSelector);

    if (divFilhaElement) {
      // Faça algo com a div filha encontrada
      console.log('Div filha encontrada');
      await new Promise(r => setTimeout(r, 2000));

      // Por exemplo, você pode pegar o conteúdo da div filha
      for (let i = 0; i < 2; i++) {
        await page.evaluate(element => element.scrollTop = element.scrollHeight, divFilhaElement);
        // Aguarde um pequeno intervalo entre as rolagens (opcional)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      //const divFilhaConteudo = await page.evaluate(element => element.scrollTop = element.scrollHeight, divFilhaElement);
      // console.log('Conteúdo da div filha:', divFilhaConteudo);
    } else {
      console.log('Div filha com tabindex igual a -1 não encontrada dentro da div pai.');
    }



  } else {
    console.log('div não encontrada')
  }

  // // Use page.$eval para encontrar o botão com base no atributo aria-label
  // const buttonText = 'Mais avaliações (598)';
  // const buttonSelector = `button[aria-label="${buttonText}"]`;

  // const buttonElement = await page.$(buttonSelector);

  // if (buttonElement) {
  //   // Realize uma ação com o botão, como clicar nele
  //   await buttonElement.click();

  //   const divSelector = 'div[aria-label="Nema Padaria - Visconde de Pirajá"][role="main"]';

  //   // Use page.$ para encontrar a div específica
  //   const divElement = await page.$(divSelector);

  //   if(divElement){
  //     console.log('div encontrada')
  //   } else {
  //     console.log('div não encontrada')
  //   }



  // } else {
  //   console.log(`Botão com o atributo aria-label "${buttonText}" não encontrado.`);
  // }

  //await scrapeInfiniteScrollItems(page,5);

  //console.log(filteredRequest);

  //await browser.close();
})();

