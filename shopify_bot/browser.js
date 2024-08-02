const fs = require('fs');
const puppeteer = require('puppeteer');

// Read URLs from the file
const urls = fs.readFileSync('shopify_all_urls.txt', 'utf-8').split('\n').filter(Boolean);
//const urls = fs.readFileSync('shopify_urls.txt', 'utf-8').split('\n').filter(Boolean);

// Define the class to handle the browser instances
class ShopifyBot {
    constructor() {
        this.browsers = [];
        this.maxConcurrentBrowsers = 10;
    }

    async start() {
        for (let i = 0; i < this.maxConcurrentBrowsers; i++) {
            const browser = await puppeteer.launch({ headless: true });
            this.browsers.push(browser);
        }

        // Process URLs in batches
        const batches = [];
        for (let i = 0; i < urls.length; i += this.maxConcurrentBrowsers) {
            batches.push(urls.slice(i, i + this.maxConcurrentBrowsers));
        }

        for (const batch of batches) {
            console.log(batch)
            await Promise.all(batch.map((url, index) => this.processUrl(url, this.browsers[index])));
        }
        //
        //    // Close all browsers
        for (const browser of this.browsers) {
            await browser.close();
        }
    }

    async processUrl(shopURL, browser) {
        const page = await browser.newPage();
        //await page.setRequestInterception(true);
        try { 
           // page.on('request', interceptedRequest => {
           //     if (
           //         interceptedRequest.url().endsWith('.png') ||
           //         interceptedRequest.url().endsWith('.jpg') 
           //     ) {
           //         interceptedRequest.abort();
           //     }
           //     else interceptedRequest.continue();
           // });

            const parsedURL = new URL(shopURL);
            const startURL = shopURL
            console.log("--------------START URL-----------------", shopURL)
            await page.goto(startURL, {waitUntil: 'networkidle2'});

            const productUrls = await this.findProduct(page)
            console.log("found products with length: ", productUrls.length)
            if(productUrls.length == 0){
                console.log(shopURL, "failed to find any product url")
                return
            }
            var resp
            for(let productUrl of productUrls){
                resp = await this.addToCart(page, productUrl)
                if(!resp.ok){
                  continue
                }
                console.log("added to cart")
                const proceedToPayment = await this.goToCartAndCheckout(shopURL, page)
                if(!proceedToPayment){
                    console.log(shopURL, "failed to proceed to payment")
                    return
                }
                console.log("reached payment page")
                const pg = await this.getDefaultPG(page,  parsedURL.hostname.split(".")[0])
                if(pg == -1){ 
                    continue 
                } else {
                    console.log("found the default PG")
                    console.log(shopURL, pg)
                    break;
                }
            }
            console.log("----------CLOSING PAGE------------")

            await page.close();
        } catch(e) {
            console.log(e)
            console.log(shopURL, "failed")
            await page.close();
        } finally {
            return; 
        }
    }

    async findProduct(page) {
        const productUrls = []
        const hrefs = await page.evaluate( () => Array.from( document.querySelectorAll( 'a' ), element => element.href) );
        const pattern = /^https?:\/\/(.+)\/products\/(.{6,})/;
        //console.log(hrefs)
        for(let i = 0; i < hrefs.length; i++){
            const url = hrefs[i]
            const match = url.match(pattern);
            //console.log(url, match);
            if(match) {
                productUrls.push(url)
                if(productUrls.length >= 10){
                    return productUrls
                }
            }
        }
        return ""
    }

    async addToCart(page, productURL) {
        try {
            await page.goto(productURL,  {waitUntil: 'networkidle2'});
            const textContent = await page.evaluate(() => {
                document.querySelector('form[action="/cart/add"]').submit()
            });

            await this.sleep(5000);
            return {
                "ok": 1
            }
        } catch(e){
            return {
                "error": e
            }
        }
    }

    async goToCartAndCheckout(shopURL, page) {
        const found = await page.evaluate(() => {
            const querySelectorsList = [ 'button[name="checkout"]', 'button[name="checkout2"]', '#cart-checkout', '.gokwik-checkout button']
            for(var l=0; l < querySelectorsList.length; l++){
                const btn = document.querySelector(querySelectorsList[l])
                if(btn){
                  btn.click();
                  return true;
                }
            }
        });
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle0' }),
            page.waitForSelector('#basic')
        ])
        await this.sleep(5000)
        return found
    }

    async getDefaultPG(page, domain) {
        try {
            if(page.url().includes("shopflo.co")){
              return "shopflo"
            }
            await page.screenshot({ path: `./images/${domain}.jpg`})
            const selectedOption = await page.evaluate(() => {
                const fieldset = document.getElementById('basic');
                const allDivs = fieldset.querySelectorAll('div')
                for (var i = 0; i < allDivs.length; i++) {
                    if (allDivs[i].id && allDivs[i].id.indexOf("basic-") !== -1) {
                        return allDivs[i].id
                    }
                } 
                return -1
            });
            return selectedOption
        } catch(e){
            return -1
        }
    }

    async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

}

// Start the bot
const bot = new ShopifyBot();
bot.start();
