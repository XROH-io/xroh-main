/**
 * Tokens & Chains Controller
 * Serves available tokens, supported chains, and real-time prices to the frontend
 */

import { Controller, Get, Query, Logger } from '@nestjs/common';

interface ChainInfo {
  id: string;
  name: string;
  icon: string;
  chainId: number | null;
  nativeToken: string;
  color: string;
}

interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  icon: string;
  chains: string[];
  coingeckoId: string;
  popular: boolean;
}

// In-memory price cache (TTL: 30 seconds)
interface PriceCache {
  prices: Record<string, number>;
  timestamp: number;
}

const priceCache: PriceCache = { prices: {}, timestamp: 0 };
const PRICE_CACHE_TTL = 30_000; // 30 seconds

const SUPPORTED_CHAINS: ChainInfo[] = [
  {
    id: 'solana',
    name: 'Solana',
    icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    chainId: null,
    nativeToken: 'SOL',
    color: '#9945FF',
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    chainId: 1,
    nativeToken: 'ETH',
    color: '#627EEA',
  },
  {
    id: 'polygon',
    name: 'Polygon',
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    chainId: 137,
    nativeToken: 'MATIC',
    color: '#8247E5',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
    chainId: 42161,
    nativeToken: 'ETH',
    color: '#28A0F0',
  },
  {
    id: 'optimism',
    name: 'Optimism',
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
    chainId: 10,
    nativeToken: 'ETH',
    color: '#FF0420',
  },
  {
    id: 'base',
    name: 'Base',
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
    chainId: 8453,
    nativeToken: 'ETH',
    color: '#0052FF',
  },
  {
    id: 'binance',
    name: 'BNB Chain',
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png',
    chainId: 56,
    nativeToken: 'BNB',
    color: '#F0B90B',
  },
  {
    id: 'avalanche',
    name: 'Avalanche',
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
    chainId: 43114,
    nativeToken: 'AVAX',
    color: '#E84142',
  },
];

const SUPPORTED_TOKENS: TokenInfo[] = [
  // Native tokens
  {
    symbol: 'SOL',
    name: 'Solana',
    address: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    chains: ['solana'],
    coingeckoId: 'solana',
    popular: true,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    chains: ['ethereum', 'arbitrum', 'optimism', 'base'],
    coingeckoId: 'ethereum',
    popular: true,
  },
  {
    symbol: 'BNB',
    name: 'BNB',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png',
    chains: ['binance'],
    coingeckoId: 'binancecoin',
    popular: true,
  },
  {
    symbol: 'MATIC',
    name: 'Polygon',
    address: '0x0000000000000000000000000000000000001010',
    decimals: 18,
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    chains: ['polygon'],
    coingeckoId: 'matic-network',
    popular: true,
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
    chains: ['avalanche'],
    coingeckoId: 'avalanche-2',
    popular: true,
  },

  // Stablecoins
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    chains: [
      'solana',
      'ethereum',
      'polygon',
      'arbitrum',
      'optimism',
      'base',
      'binance',
      'avalanche',
    ],
    coingeckoId: 'usd-coin',
    popular: true,
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
    icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
    chains: [
      'solana',
      'ethereum',
      'polygon',
      'arbitrum',
      'optimism',
      'binance',
      'avalanche',
    ],
    coingeckoId: 'tether',
    popular: true,
  },
  {
    symbol: 'DAI',
    name: 'Dai',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18,
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    coingeckoId: 'dai',
    popular: true,
  },

  // Major tokens
  {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    decimals: 8,
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    coingeckoId: 'wrapped-bitcoin',
    popular: true,
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    decimals: 18,
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x514910771AF9Ca656af840dff83E8264EcF986CA/logo.png',
    chains: [
      'ethereum',
      'polygon',
      'arbitrum',
      'optimism',
      'base',
      'avalanche',
    ],
    coingeckoId: 'chainlink',
    popular: false,
  },
  {
    symbol: 'UNI',
    name: 'Uniswap',
    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    decimals: 18,
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png',
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
    coingeckoId: 'uniswap',
    popular: false,
  },
  {
    symbol: 'AAVE',
    name: 'Aave',
    address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    decimals: 18,
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9/logo.png',
    chains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche'],
    coingeckoId: 'aave',
    popular: false,
  },

  // Solana ecosystem tokens
  {
    symbol: 'RAY',
    name: 'Raydium',
    address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
    chains: ['solana'],
    coingeckoId: 'raydium',
    popular: false,
  },
  {
    symbol: 'JUP',
    name: 'Jupiter',
    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    icon: 'https://static.jup.ag/jup/icon.png',
    chains: ['solana'],
    coingeckoId: 'jupiter-exchange-solana',
    popular: false,
  },
  {
    symbol: 'BONK',
    name: 'Bonk',
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,
    icon: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
    chains: ['solana'],
    coingeckoId: 'bonk',
    popular: false,
  },
  {
    symbol: 'WIF',
    name: 'dogwifhat',
    address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    decimals: 6,
    icon: 'https://bafkreibk3covs5ltyqxa272uodhaculbr6keu6s6lqbcbdqgp6nmoyzwqi.ipfs.nftstorage.link',
    chains: ['solana'],
    coingeckoId: 'dogwifcoin',
    popular: false,
  },

  // More EVM tokens
  {
    symbol: 'ARB',
    name: 'Arbitrum',
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    decimals: 18,
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
    chains: ['arbitrum'],
    coingeckoId: 'arbitrum',
    popular: false,
  },
  {
    symbol: 'OP',
    name: 'Optimism',
    address: '0x4200000000000000000000000000000000000042',
    decimals: 18,
    icon: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
    chains: ['optimism'],
    coingeckoId: 'optimism',
    popular: false,
  },
];

@Controller('tokens')
export class TokensController {
  private readonly logger = new Logger(TokensController.name);

  @Get()
  getTokens(@Query('chain') chain?: string) {
    if (chain) {
      return SUPPORTED_TOKENS.filter((t) =>
        t.chains.includes(chain.toLowerCase()),
      );
    }
    return SUPPORTED_TOKENS;
  }

  @Get('chains')
  getChains() {
    return SUPPORTED_CHAINS;
  }

  @Get('popular')
  getPopularTokens(@Query('chain') chain?: string) {
    let tokens = SUPPORTED_TOKENS.filter((t) => t.popular);
    if (chain) {
      tokens = tokens.filter((t) => t.chains.includes(chain.toLowerCase()));
    }
    return tokens;
  }

  /**
   * GET /tokens/prices?ids=ethereum,solana,binancecoin
   * Returns real-time USD prices from CoinGecko
   */
  @Get('prices')
  async getPrices(@Query('ids') ids?: string): Promise<Record<string, number>> {
    // Get all unique coingeckoIds from tokens, or use provided ids
    const coingeckoIds = ids
      ? ids.split(',').map((id) => id.trim())
      : [...new Set(SUPPORTED_TOKENS.map((t) => t.coingeckoId))];

    // Check cache
    const now = Date.now();
    const cachedIds = coingeckoIds.filter(
      (id) => priceCache.prices[id] !== undefined,
    );
    const allCached =
      cachedIds.length === coingeckoIds.length &&
      now - priceCache.timestamp < PRICE_CACHE_TTL;

    if (allCached) {
      const result: Record<string, number> = {};
      for (const id of coingeckoIds) {
        result[id] = priceCache.prices[id];
      }
      return result;
    }

    // Fetch fresh prices from CoinGecko
    try {
      const idsParam = coingeckoIds.join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`;

      this.logger.log(`Fetching prices from CoinGecko for: ${idsParam}`);

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `CoinGecko API returned ${response.status}, using cached prices`,
        );
        // Return cached prices if available, otherwise return fallback
        if (Object.keys(priceCache.prices).length > 0) {
          const result: Record<string, number> = {};
          for (const id of coingeckoIds) {
            result[id] = priceCache.prices[id] || 0;
          }
          return result;
        }
        return this.getFallbackPrices(coingeckoIds);
      }

      const data = await response.json();

      // Update cache
      const result: Record<string, number> = {};
      for (const id of coingeckoIds) {
        const price = data[id]?.usd || 0;
        result[id] = price;
        priceCache.prices[id] = price;
      }
      priceCache.timestamp = now;

      this.logger.log(`Prices fetched: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch prices: ${error.message}`);
      // Return cached or fallback prices
      if (Object.keys(priceCache.prices).length > 0) {
        const result: Record<string, number> = {};
        for (const id of coingeckoIds) {
          result[id] = priceCache.prices[id] || 0;
        }
        return result;
      }
      return this.getFallbackPrices(coingeckoIds);
    }
  }

  /**
   * GET /tokens/estimate?from=ethereum&to=solana&amount=1
   * Quick price estimate using coingecko IDs - no route needed
   */
  @Get('estimate')
  async getEstimate(
    @Query('from') fromId: string,
    @Query('to') toId: string,
    @Query('amount') amount: string,
  ): Promise<{
    estimatedOutput: number;
    fromPriceUsd: number;
    toPriceUsd: number;
    rate: number;
  }> {
    const prices = await this.getPrices(`${fromId},${toId}`);
    const fromPrice = prices[fromId] || 0;
    const toPrice = prices[toId] || 0;
    const inputAmount = parseFloat(amount) || 0;

    if (fromPrice === 0 || toPrice === 0) {
      return {
        estimatedOutput: 0,
        fromPriceUsd: fromPrice,
        toPriceUsd: toPrice,
        rate: 0,
      };
    }

    const rate = fromPrice / toPrice;
    const estimatedOutput = inputAmount * rate;

    return {
      estimatedOutput: parseFloat(estimatedOutput.toFixed(8)),
      fromPriceUsd: fromPrice,
      toPriceUsd: toPrice,
      rate: parseFloat(rate.toFixed(8)),
    };
  }

  /**
   * Fallback prices when CoinGecko is unavailable
   */
  private getFallbackPrices(ids: string[]): Record<string, number> {
    const fallback: Record<string, number> = {
      ethereum: 3500,
      solana: 170,
      binancecoin: 600,
      'matic-network': 0.45,
      'avalanche-2': 35,
      'usd-coin': 1,
      tether: 1,
      dai: 1,
      'wrapped-bitcoin': 95000,
      chainlink: 15,
      uniswap: 7,
      aave: 200,
      raydium: 3,
      'jupiter-exchange-solana': 0.8,
      bonk: 0.000025,
      dogwifcoin: 1.5,
      arbitrum: 0.7,
      optimism: 1.5,
    };
    const result: Record<string, number> = {};
    for (const id of ids) {
      result[id] = fallback[id] || 0;
    }
    return result;
  }
}
