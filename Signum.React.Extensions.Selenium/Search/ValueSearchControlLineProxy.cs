using OpenQA.Selenium;
using OpenQA.Selenium.Remote;
using Signum.Entities;
using Signum.React.Selenium;
using System;
using System.Collections.Generic;
using System.Text;

namespace Signum.React.Extensions.Selenium.Search
{
    public class ValueSearchControlLineProxy
    {
        public RemoteWebDriver Selenium { get; private set; }

        public IWebElement Element { get; private set; }

        public ValueSearchControlLineProxy(IWebElement element)
        {
            this.Selenium = element.GetDriver();
            this.Element = element;
        }

        public WebElementLocator CountSearch
        {
            get { return this.Element.WithLocator(By.CssSelector(".count-search")); }
        }

        public WebElementLocator FindButton
        {
            get { return this.Element.WithLocator(By.CssSelector(".sf-line-button.sf-find")); }
        }

        public WebElementLocator CreateButton
        {
            get { return this.Element.WithLocator(By.CssSelector(".sf-line-button.sf-create")); }
        }

        public FrameModalProxy<T> Create<T>() where T : ModifiableEntity
        {
            var popup = this.CreateButton.Find().CaptureOnClick();

            if (SelectorModalProxy.IsSelector(popup))
                popup = popup.GetDriver().CapturePopup(() => SelectorModalProxy.Select(popup, typeof(T)));

            return new FrameModalProxy<T>(popup).WaitLoaded();
        }
    }
}
