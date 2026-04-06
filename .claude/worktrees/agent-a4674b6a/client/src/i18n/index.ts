import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import zhCommon from './zh/common.json'
import zhCustomer from './zh/customer.json'
import zhAdmin from './zh/admin.json'
import enCommon from './en/common.json'
import enCustomer from './en/customer.json'
import enAdmin from './en/admin.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { common: zhCommon, customer: zhCustomer, admin: zhAdmin },
      en: { common: enCommon, customer: enCustomer, admin: enAdmin },
    },
    fallbackLng: 'zh',
    defaultNS: 'common',
    ns: ['common', 'customer', 'admin'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'i18n-lang',
      caches: ['localStorage'],
    },
  })

export default i18n
