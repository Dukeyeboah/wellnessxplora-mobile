/** Wellness, health, and mindfulness quotes with documented attribution. */
export const WELLNESS_QUOTES = [
  {
    text: 'Wellness is not a destination—it is a way of traveling.',
    author: 'Unknown',
  },
  {
    text: 'Take care of your body. It is the only place you have to live.',
    author: 'Jim Rohn',
  },
  {
    text: 'Almost everything will work again if you unplug it for a few minutes—including you.',
    author: 'Anne Lamott',
  },
  {
    text: 'The greatest wealth is health.',
    author: 'Virgil',
  },
  {
    text: 'In the seed and the soil, we find the answers to every one of the crises we face.',
    author: 'Vandana Shiva',
  },
  {
    text: 'Self-care is giving the world the best of you, instead of what is left of you.',
    author: 'Katie Reed',
  },
  {
    text: 'Nature does not hurry, yet everything is accomplished.',
    author: 'Lao Tzu',
  },
  {
    text: 'Health cannot be a question of income; it is a fundamental human right.',
    author: 'Nelson Mandela',
  },
  {
    text: 'Rest and self-care are so important. When you take time to replenish your spirit, it allows you to serve others from the overflow.',
    author: 'Eleanor Brown',
  },
  {
    text: 'Healing takes courage, and we all have courage—even if we have to dig a little to find it.',
    author: 'Tori Amos',
  },
  {
    text: 'It is health that is real wealth and not pieces of gold and silver.',
    author: 'Mahatma Gandhi',
  },
  {
    text: 'Just as unhealthy food causes metabolic disorders in individuals, \'junk energy\' from fossil fuels leads to pollution and a \'metabolic disease\' of the Earth. Food is our first medicine, and the food web is the ultimate connector of all life.',
    author: 'Vandana Shiva',
  },
  {
    text: 'The groundwork of all happiness is health.',
    author: 'Leigh Hunt',
  },
  {
    text: 'Let food be thy medicine and medicine be thy food.',
    author: 'Hippocrates',
  },
  {
    text: 'Follow your heart as long as you live.',
    author: 'Ptahhotep',
  },
  {
    text: 'Walking is man\'s best medicine.',
    author: 'Hippocrates',
  },
  {
    text: 'Health is a state of complete harmony of the body, mind and spirit.',
    author: 'B.K.S. Iyengar',
  },
  {
    text: 'In nature\'s economy, the currency is not money, it is life.',
    author: 'Vandana Shiva',
  },
  {
    text: 'Peace comes from within. Do not seek it without.',
    author: 'Buddha',
  },
  {
    text: 'Smile, breathe and go slowly.',
    author: 'Thich Nhat Hanh',
  },
  {
    text: 'My little thing is planting trees.',
    author: 'Wangari Maathai',
  },
  {
    text: 'The present moment is the only time over which we have dominion.',
    author: 'Thich Nhat Hanh',
  },
  {
    text: 'True happiness is to enjoy the present, without anxious dependence upon the future.',
    author: 'Seneca',
  },
  {
    text: 'You are not Atlas carrying the world on your shoulder. It is good to remember that the planet is carrying you.',
    author: 'Vandana Shiva',
  },
  {
    text: 'You have power over your mind—not outside events. Realize this, and you will find strength.',
    author: 'Marcus Aurelius',
  },
  {
    text: 'The first wealth is health.',
    author: 'Ralph Waldo Emerson',
  },
  {
    text: 'Physical fitness is the first requisite of happiness.',
    author: 'Joseph Pilates',
  },
  {
    text: 'The Earth is a living system, responsive and intelligent... We are not separate from nature; we are nature. And when we embrace this reality, we don\'t just sustain the world, we help it flourish.',
    author: 'Vandana Shiva',
  },
  {
    text: 'Sleep is the best meditation.',
    author: 'Dalai Lama',
  },
  {
    text: 'Health is not valued till sickness comes.',
    author: 'Thomas Fuller',
  },
  {
    text: 'Take rest; a field that has rested gives a bountiful crop.',
    author: 'Ovid',
  },
  {
    text: 'Your body hears everything your mind says.',
    author: 'Naomi Judd',
  },
  {
    text: 'Healing the Earth requires seeing the earth as one family... The war against the Earth and each other must stop.',
    author: 'Vandana Shiva',
  },
  {
    text: 'Those who think they have no time for bodily exercise will sooner or later have to find time for illness.',
    author: 'Edward Stanley',
  },
  {
    text: 'It\'s not what happens to you, but how you react to it that matters.',
    author: 'Epictetus',
  },
  {
    text: 'To keep the body in good health is a duty, otherwise we shall not be able to keep our mind strong and clear.',
    author: 'Buddha',
  },
  {
    text: 'Happiness is not something ready made. It comes from your own actions.',
    author: 'Dalai Lama',
  },
  {
    text: 'When you are doing the right thing for the Earth, she gives you great company.',
    author: 'Vandana Shiva',
  },
  {
    text: 'Wherever you are, be there totally.',
    author: 'Eckhart Tolle',
  },
  {
    text: 'The soul always knows what to do to heal itself. The challenge is to silence the mind.',
    author: 'Caroline Myss',
  },
  {
    text: 'Nothing will work unless you do.',
    author: 'Maya Angelou',
  },
] as const;

/** Pick a random quote index, optionally avoiding the current one. */
export function randomQuoteIndex(exclude?: number): number {
  const n = WELLNESS_QUOTES.length;
  if (n <= 1) return 0;
  let idx = Math.floor(Math.random() * n);
  while (idx === exclude) {
    idx = Math.floor(Math.random() * n);
  }
  return idx;
}
