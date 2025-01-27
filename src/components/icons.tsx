import { Wallet } from 'lucide-react';

export const Icons = {
  stripe: (props: React.ComponentProps<'svg'>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 512"
      fill="currentColor"
      {...props}
    >
      <path d="M165 144.7l-43.3 9.2-.2 142.4c0 26.3 19.8 43.3 46.1 43.3 14.6 0 25.3-2.7 31.2-5.9v-33.8c-5.7 2.3-33.7 10.5-33.7-15.7V221h33.7v-37.8h-33.7zm89.1 51.6l-2.7-13.1H213v153.2h44.3V233.3c10.5-13.8 28.2-11.1 33.9-9.3v-40.8c-6-2.1-26.7-6-37.1 13.1zm92.3-72.3l-44.6 9.5v3.3c10.7-7.2 38.4-9.3 38.4 5.3v122.8c0 13.3-6.7 23.9-21.1 23.9-19.9 0-19.4-22-19.4-22.2l-42.7 9.1c0 .6-.2 52.1 62.2 52.1 39.6 0 60.8-28.5 60.8-63.8V138.7c0-10.3-4.9-13.6-11.6-15l-22 4.3zm92.8 53.9c-13.3 0-22.4 7.2-25.3 18.4l30.1-7c-.7-3.8-2.6-11.4-4.8-11.4zm-7.7-3.7c25.9 0 44 22.7 44 49.3 0 7.4-1.2 11.9-2.6 15.1l-71.4 15.7c8.3 14.6 21.9 10.8 33.9 6.3l20.1 25.1c-10.3 8.4-23.4 11.6-36.6 11.6-36.9 0-57.5-32.8-57.5-60.7-.1-30.3 24.7-62.4 70.1-62.4zm0-48.3c-16.3 0-26.1 7-31.6 18.4l31.9-7c-.7-3.8-2.9-11.4-5.1-11.4h4.8zm-14.6-8.7c26.2 0 46.1 22.9 46.1 49.6 0 7.4-1.2 11.9-2.6 15.1l-71.9 15.7c8.3 14.7 22 10.7 34 6.3l20.1 25.3c-10.3 8.4-23.4 11.6-36.6 11.6-36.9 0-59.5-32.6-59.5-60.7 0-30.3 24.7-62.8 70.4-62.8v-.1z"/>
    </svg>
  ),
  wallet: Wallet,
}; 
