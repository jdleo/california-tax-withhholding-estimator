import {
  FED_BRACKETS,
  CA_BRACKETS,
  statusClass,
  taxFromBrackets,
  marginalRate,
} from './brackets.ts';
import { test, eq, isTrue } from './testing.ts';

test('brackets are well-formed', () => {
  for (const table of [FED_BRACKETS.single, FED_BRACKETS.mfj, CA_BRACKETS.single, CA_BRACKETS.mfj]) {
    isTrue(table[table.length - 1].upTo === Infinity, 'last bracket must be open');
    for (let i = 1; i < table.length; i++) {
      isTrue(table[i].upTo > table[i - 1].upTo, 'bracket tops must strictly increase');
    }
  }
  eq(FED_BRACKETS.single[0].upTo, 12400);
  eq(FED_BRACKETS.single[6].rate, 0.37);
  eq(FED_BRACKETS.mfj[0].upTo, 24800);
  eq(CA_BRACKETS.single[7].upTo, 721314);
  eq(CA_BRACKETS.single[8].rate, 0.123);
  eq(CA_BRACKETS.mfj[7].upTo, 1442628);
  eq(CA_BRACKETS.mfj[8].rate, 0.123);
});

test('federal tax, single, every bracket boundary', () => {
  const b = FED_BRACKETS.single;
  eq(taxFromBrackets(0, b), 0);
  eq(taxFromBrackets(12399, b), 1239.9);
  eq(taxFromBrackets(12400, b), 1240);
  eq(taxFromBrackets(50400, b), 5800);
  eq(taxFromBrackets(105700, b), 17966);
  eq(taxFromBrackets(201775, b), 41024);
  eq(taxFromBrackets(256225, b), 58448);
  eq(taxFromBrackets(640600, b), 192979.25);
  eq(taxFromBrackets(640601, b), 192979.62);
  eq(taxFromBrackets(1500000, b), 510957.25);
});

test('federal tax, MFJ, every bracket boundary', () => {
  const b = FED_BRACKETS.mfj;
  eq(taxFromBrackets(24800, b), 2480);
  eq(taxFromBrackets(100800, b), 11600);
  eq(taxFromBrackets(211400, b), 35932);
  eq(taxFromBrackets(403550, b), 82048);
  eq(taxFromBrackets(512450, b), 116896);
  eq(taxFromBrackets(768700, b), 206583.5);
  eq(taxFromBrackets(768701, b), 206583.87);
});

test('CA tax, single, every bracket boundary', () => {
  const b = CA_BRACKETS.single;
  eq(taxFromBrackets(10756, b), 107.56);
  eq(taxFromBrackets(25499, b), 402.42);
  eq(taxFromBrackets(40245, b), 992.26);
  eq(taxFromBrackets(55866, b), 1929.52);
  eq(taxFromBrackets(70612, b), 3109.2);
  eq(taxFromBrackets(360659, b), 30083.571);
  eq(taxFromBrackets(432787, b), 37512.755);
  eq(taxFromBrackets(721314, b), 70116.306);
});

test('CA tax, MFJ, every bracket boundary', () => {
  const b = CA_BRACKETS.mfj;
  eq(taxFromBrackets(21512, b), 215.12);
  eq(taxFromBrackets(50998, b), 804.84);
  eq(taxFromBrackets(80490, b), 1984.52);
  eq(taxFromBrackets(111732, b), 3859.04);
  eq(taxFromBrackets(141224, b), 6218.4);
  eq(taxFromBrackets(721318, b), 60167.142);
  eq(taxFromBrackets(865574, b), 75025.51);
  eq(taxFromBrackets(1442628, b), 140232.612);
});

test('marginal rate lands in the right bracket', () => {
  eq(marginalRate(0, FED_BRACKETS.single), 0.1);
  eq(marginalRate(12399, FED_BRACKETS.single), 0.1);
  eq(marginalRate(12400, FED_BRACKETS.single), 0.12);
  eq(marginalRate(105700, FED_BRACKETS.single), 0.24);
  eq(marginalRate(640600, FED_BRACKETS.single), 0.37);
  eq(marginalRate(1500000, CA_BRACKETS.mfj), 0.123);
});

test('status class mapping', () => {
  isTrue(statusClass('single') === 'single', 'single');
  isTrue(statusClass('mfs') === 'single', 'mfs');
  isTrue(statusClass('hoh') === 'single', 'hoh');
  isTrue(statusClass('mfj') === 'mfj', 'mfj');
  isTrue(statusClass('qss') === 'mfj', 'qss');
});
