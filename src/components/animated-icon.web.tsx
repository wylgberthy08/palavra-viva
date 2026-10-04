/**
 * Na web não há splash nativa para cobrir: `expo-splash-screen` não tem
 * implementação para navegador e um overlay aqui só atrasaria a primeira
 * renderização da página.
 */
export function AnimatedSplashOverlay() {
  return null;
}