# california-tax-withhholding-estimator

Super simple app I made for myself. I was inspired by the [Federal Tax Withholding Estimator](https://www.irs.gov/individuals/tax-withholding-estimator) but wanted one specifically for California, and was also tech-friendly (RSU-aware).

View the app here: https://taxes-are-annoying.vercel.app

1. Enter some preliminary questions to see hidden tax benefits
2. Enter your filing status and dependents
3. Enter how much you've made and how much you've paid on taxes
4. Enter how much your normal paychecks are
5. Enter your upcoming vests

Then it will show you how much you'll underpay/overpay and what W2 adjustments you have to make to get to neutral ($0 owed) for both California and Federal.

It's intentionally simple, because I did make it for myself (however I made most elements generic to all).

## Install

```bash
pnpm install
```

## Dev

```bash
pnpm dev
```

## Build

```bash
pnpm run build
```
