import { chromium } from 'playwright'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import { writeFileSync } from 'fs'
import { createEvent } from 'ics'
import { config } from './staticFiles.js'
import { notify } from './lib/ntfy.js'

dayjs.extend(customParseFormat)

async function prepareAntiBot(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
}
/**
async function getAntiBotToken(page, timeout = 20000) {
  console.log('🛡️ [ANTI-BOT] Génération du token…')

  const start = Date.now()

  while (Date.now() - start < timeout) {
    try {
      // attends que la page arrête de bouger
      await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {})

      // Sélecteurs possibles
      const selector = '#li-antibot-token, input[name="li-antibot-token"]'

      const tokenField = await page.$(selector)

      if (tokenField) {
        const val = await tokenField.evaluate(el => el.value?.trim() || '')

        console.log('📥 Token lu :', val || '(vide)')

        if (val && val.length > 5) {
          console.log('✅ Token final :', val)
          return val
        }
      }

      // Mouvement souris + scroll mais protégé contre navigation
      await Promise.all([
        page.waitForLoadState('domcontentloaded').catch(() => {}),
        (async () => {
          try {
            await page.mouse.move(30 + Math.random() * 50, 20 + Math.random() * 50)
            await page.waitForTimeout(60)
            await page.mouse.down()
            await page.waitForTimeout(40)
            await page.mouse.up()
            await page.evaluate(() => window.scrollBy(0, 150)).catch(() => {})
          } catch {
            console.log('text')
          }
        })()
      ])

      await page.waitForTimeout(250)

    } catch (err) {
      console.log('⚠️ Erreur silencieuse anti-bot :', err.message)
    }
  }

  throw new Error('❌ Timeout anti-bot : token introuvable.')
}*/
async function getAntiBotToken(page, timeout = 20000) {
  console.log('🛡️ [ANTI-BOT] Démarrage récupération token…');
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const elapsed = Date.now() - start;
    console.log(`⏳ [ANTI-BOT] Tentative +${elapsed}ms`);

    try {
      console.log('📡 Attente stabilisation réseau (networkidle)…');
      await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {
        console.log('⚠️ networkidle timeout → page encore active');
      });

      const url = page.url();
      console.log('🌍 URL actuelle :', url);

      // Vérifie si LiveIdentity est injecté
      const live = await page.evaluate(() => {
        return !!document.querySelector('script[src*="liveidentity"], script[src*="captcha"]');
      }).catch(() => false);

      console.log('📡 LiveIdentity présent :', live);

      // Recherche du champ
      const selector = '#li-antibot-token, input[name="li-antibot-token"]';
      const tokenField = await page.$(selector);

      console.log('🔍 Champ token trouvé :', !!tokenField);

      if (tokenField) {
        const html = await tokenField.evaluate(el => el.outerHTML).catch(() => '(inaccessible)');
        console.log('🖼️ HTML du champ token :', html);

        const val = await tokenField.evaluate(el => el.value?.trim() || '').catch(() => '');
        console.log('📥 Valeur lue :', val || '(vide)');

        if (val && val.length > 5) {
          console.log('🎉 Token final trouvé !', val);
          return val;
        }
      } else {
        console.log('⚠️ Champ token absent → la page a peut-être rechargé');
      }

      // ACTION UTILISATEUR SIMULÉE
      console.log('🖱️ Simulation souris + scroll…');

      await Promise.all([
        page.waitForLoadState('domcontentloaded').catch(() => {
          console.log('⚠️ domcontentloaded timeout → page instable');
        }),
        (async () => {
          try {
            const x = 30 + Math.random() * 50;
            const y = 20 + Math.random() * 50;
            console.log(`➡️ move souris vers (${x.toFixed(0)}, ${y.toFixed(0)})`);

            await page.mouse.move(x, y);
            await page.waitForTimeout(60);
            await page.mouse.down();
            await page.waitForTimeout(40);
            await page.mouse.up();

            console.log('➡️ scroll…');
            await page.evaluate(() => window.scrollBy(0, 150)).catch(() => {
              console.log('⚠️ Erreur scroll → navigation probable');
            });
          } catch (err) {
            console.log('⚠️ Erreur simulation souris :', err.message);
          }
        })()
      ]);

      await page.waitForTimeout(250);

    } catch (err) {
      console.log('🔥 ERREUR MAJEURE DANS LOOP ANTI-BOT :', err.message);
    }
  }

  console.log('❌ [ANTI-BOT] TOKEN NON RÉCUPÉRÉ → timeout.');
  console.log('📸 Capture screenshot failure.png');

  try {
    await page.screenshot({ path: 'failure.png' });
  } catch (err) {
    console.log('⚠️ Screenshot impossible :', err.message);
  }

  throw new Error('❌ Impossible de récupérer le token anti-bot.');
}



const bookTennis = async () => {
  const DRY_RUN_MODE = process.argv.includes('--dry-run')
  if (DRY_RUN_MODE) {
    console.log('----- DRY RUN START -----')
    console.log('Script lancé en mode DRY RUN. Afin de tester votre configuration, une recherche va être lancé mais AUCUNE réservation ne sera réalisée')
  }

  console.log(`${dayjs().format()} - Starting searching tennis`)
  const browser = await chromium.launch({
    headless: true,   // impératif dans GitHub Actions
    slowMo: 0,         // facultatif : ralentir n’a aucun sens en CI
    timeout: 120000
  })
  console.log(`${dayjs().format()} - Browser started`)
  const page = await browser.newPage()
  await prepareAntiBot(page)
  await page.route('https://captcha.liveidentity.com/**invisible-captcha-infos**', (route) => route.abort())
  page.setDefaultTimeout(120000)
  await page.goto('https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=tennis&view=start&full=1')

  await page.click('#button_suivi_inscription')
  await page.fill('#username', config.account.email)
  await page.fill('#password', config.account.password)
  await page.click('#form-login >> button')

  console.log(`${dayjs().format()} - User connected`)

  // wait for login redirection before continue
  await page.waitForSelector('.main-informations')

  try {
    const locations = !Array.isArray(config.locations) ? Object.keys(config.locations) : config.locations
    locationsLoop:
    for (const location of locations) {
      console.log(`${dayjs().format()} - Search at ${location}`)
      await page.goto('https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=recherche&view=recherche_creneau#!')

      // select tennis location
      await page.locator('.tokens-input-text').pressSequentially(`${location} `)
      await page.waitForSelector(`.tokens-suggestions-list-element >> text="${location}"`)
      await page.click(`.tokens-suggestions-list-element >> text="${location}"`)

      // select date
      await page.click('#when')
      const date = config.date ? dayjs(config.date, 'D/MM/YYYY') : dayjs().add(6, 'days')
      await page.waitForSelector(`[dateiso="${date.format('DD/MM/YYYY')}"]`)
      await page.click(`[dateiso="${date.format('DD/MM/YYYY')}"]`)
      await page.waitForSelector('.date-picker', { state: 'hidden' })

      await page.click('#rechercher')
      
      const token = await getAntiBotToken(page)
      await page.evaluate(token => {
        let input = document.querySelector('input[name="li-antibot-token"]')
        if (!input) {
          input = document.createElement('input')
          input.type = 'hidden'
          input.name = 'li-antibot-token'
          document.querySelector('form').appendChild(input)
        }
        input.value = token
      }, token)
      // wait until the results page is fully loaded before continue
      await page.waitForLoadState('domcontentloaded')

      let selectedHour
      hoursLoop:
      for (const hour of config.hours) {
        const dateDeb = `[datedeb="${date.format('YYYY/MM/DD')} ${hour}:00:00"]`
        if (await page.$(dateDeb)) {
          if (await page.isHidden(dateDeb)) {
            await page.click(`#head${location.replaceAll(' ', '')}${hour}h .panel-title`)
          }

          const courtNumbers = !Array.isArray(config.locations) ? config.locations[location] : []
          const slots = await page.$$(dateDeb)
          for (const slot of slots) {
            const bookSlotButton = `[courtid="${await slot.getAttribute('courtid')}"]${dateDeb}`
            if (courtNumbers.length > 0) {
              const courtName = (await (await page.$(`.court:left-of(${bookSlotButton})`)).innerText()).trim()
              if (!courtNumbers.includes(parseInt(courtName.match(/Court N°(\d+)/)[1]))) {
                continue
              }
            }

            const [priceType, courtType] = (await (await page.$(`.price-description:left-of(${bookSlotButton})`)).innerHTML()).split('<br>')
            if (!config.priceType.includes(priceType) || !config.courtType.includes(courtType)) {
              continue
            }
            selectedHour = hour
            await page.click(bookSlotButton)

            break hoursLoop
          }
        }
      }

      if (await page.title() !== 'Paris | TENNIS - Reservation') {
        console.log(`${dayjs().format()} - Failed to find reservation for ${location}`)
        continue
      }

      await page.waitForSelector('.order-steps-infos h2 >> text="1 / 3 - Validation du court"')

      for (const [i, player] of config.players.entries()) {
        if (i > 0 && i < config.players.length) {
          await page.click('.addPlayer')
        }
        await page.waitForSelector(`[name="player${i + 1}"]`)
        await page.fill(`[name="player${i + 1}"] >> nth=0`, player.lastName)
        await page.fill(`[name="player${i + 1}"] >> nth=1`, player.firstName)
      }

      await page.keyboard.press('Enter')

      await page.waitForSelector('#order_select_payment_form #paymentMode', { state: 'attached' })
      const paymentMode = await page.$('#order_select_payment_form #paymentMode')
      await paymentMode.evaluate(el => {
        el.removeAttribute('readonly')
        el.style.display = 'block'
      })
      await paymentMode.fill('existingTicket')

      if (DRY_RUN_MODE) {
        console.log(`${dayjs().format()} - Fausse réservation faite : ${location}`)
        console.log(`pour le ${date.format('YYYY/MM/DD')} à ${selectedHour}h`)
        console.log('----- DRY RUN END -----')
        console.log('Pour réellement réserver un crénau, relancez le script sans le paramètre --dry-run')

        await page.click('#previous')
        await page.click('#btnCancelBooking')

        break locationsLoop
      }

      const submit = await page.$('#order_select_payment_form #envoyer')
      submit.evaluate(el => el.classList.remove('hide'))
      await submit.click()

      await page.waitForSelector('.confirmReservation')

      // Extract reservation details
      const address = (await (await page.$('.address')).textContent()).trim().replace(/( ){2,}/g, ' ')
      const dateStr = (await (await page.$('.date')).textContent()).trim().replace(/( ){2,}/g, ' ')
      const court = (await (await page.$('.court')).textContent()).trim().replace(/( ){2,}/g, ' ')

      console.log(`${dayjs().format()} - Réservation faite : ${address}`)
      console.log(`pour le ${dateStr}`)
      console.log(`sur le ${court}`)

      const [day, month, year] = [date.date(), date.month() + 1, date.year()]
      const hourMatch = dateStr.match(/(\d{2})h/)
      const hour = hourMatch ? Number(hourMatch[1]) : 12
      const start = [year, month, day, hour, 0]
      const duration = { hours: 1, minutes: 0 }
      const event = {
        start,
        duration,
        title: 'Réservation Tennis',
        description: `Court: ${court}\nAdresse: ${address}`,
        location: address,
        status: 'CONFIRMED',
      }
      createEvent(event, async (error, value) => {
        if (error) {
          console.log('ICS creation error:', error)
          return
        }

        writeFileSync('event.ics', value)
        if (config.ntfy?.enable === true) {
          await notify(Buffer.from(value, 'utf8'), `Confirmation pour le ${date.format('DD/MM/YYYY')}`, config.ntfy)
        }
      })
      break
    }
  } catch (e) {
    console.log(e)
    await page.screenshot({ path: 'img/failure.png' })
  }

  await browser.close()
}

bookTennis()
