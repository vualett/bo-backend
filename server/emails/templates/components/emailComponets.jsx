import React from 'react';
/* eslint-disable react/jsx-no-target-blank */

const fontFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif";

const textDefaults = {
  fontFamily,
  fontSize: 16,
  color: '#404040',
  fontWeight: 300,
  lineHeight: 1.5
};

export const Title = ({ children, style }) => (
  <h1
    style={{
      ...textDefaults,
      fontSize: 22,
      fontWeight: 'normal',
      margin: 0,
      padding: 0,
      fontFamily,
      ...style
    }}
  >
    {children}
  </h1>
);

export const P = ({ children, style }) => (
  <p
    style={{
      ...textDefaults,
      margin: 0,
      padding: 0,
      fontFamily,
      marginBottom: 0,
      ...style
    }}
  >
    {children}
  </p>
);

export const Button = ({ children, style, href }) => (
  <a
    href={href}
    target="_blank"
    style={{
      ...textDefaults,
      backgroundColor: '#0069ff',
      borderRadius: '5px',
      color: '#ffffff',
      display: 'inline-block',
      fontSize: 15,
      fontWeight: 500,
      lineHeight: '50px',
      textAlign: 'center',
      textDecoration: 'none',
      webkitTextSizeAdjust: 'none',
      paddingLeft: 20,
      paddingRight: 20,
      ...style
    }}
  >
    {children}
  </a>
);

export const Link = ({ children, href, style }) => (
  <a
    href={href}
    target="_blank"
    style={{
      ...textDefaults,
      fontSize: 'inherit',
      color: 'inherit',
      textDecoration: 'none',
      ...style
    }}
  >
    {children}
  </a>
);

export const Span = ({ children, style }) => (
  <span
    style={{
      ...textDefaults,
      fontSize: 'inherit',
      color: 'inherit',
      ...style
    }}
  >
    {children}
  </span>
);
