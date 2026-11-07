import { Component } from 'react';

// A safety net: if something in the site breaks, this shows a way back instead of a blank page.
// A game being recorded is kept on the device, so reloading never loses it.
export class CrashGuard extends Component {
  state = { broken: false };
  static getDerivedStateFromError() { return { broken: true }; }
  componentDidCatch(e, info) { console.error('Brickhampton Stats broke:', e, info?.componentStack); }
  render() {
    if (!this.state.broken) return this.props.children;
    return (
      <div className="crash" role="alert">
        <h1>Something went wrong</h1>
        <p>Sorry, part of the site stopped working. Reloading usually fixes it, and a game you're recording is kept on this device.</p>
        <button className="btn primary" onClick={() => { location.hash = ''; location.reload(); }}>Reload</button>
      </div>
    );
  }
}
