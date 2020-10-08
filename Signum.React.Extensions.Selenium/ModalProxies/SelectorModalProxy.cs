using System;
using System.Threading;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using OpenQA.Selenium;
using Signum.Engine.Basics;
using Signum.Utilities;

namespace Signum.React.Selenium
{
    public class SelectorModalProxy : ModalProxy
    {
        public SelectorModalProxy(IWebElement element) : base(element) { }

        public void Select(string value)
        {
            SelectPrivate(value);
            this.WaitNotVisible();
        }

        public void Select(Enum enumValue)
        {
            SelectPrivate(enumValue.ToString());
            this.WaitNotVisible();
        }

        public void Select<T>()
        {
            SelectPrivate(TypeLogic.GetCleanName(typeof(T)));
            this.WaitNotVisible();
        }

        public IWebElement SelectAndCapture(string value)
        {
            return this.Element.GetDriver().CapturePopup(() => SelectPrivate(value));
        }

        public IWebElement SelectAndCapture(Enum enumValue)
        {
            return this.Element.GetDriver().CapturePopup(() => SelectPrivate(enumValue.ToString()));
        }

        public IWebElement SelectAndCapture<T>()
        {
            return this.Element.GetDriver().CapturePopup(() => SelectPrivate(TypeLogic.GetCleanName(typeof(T))));
        }

        public static bool IsSelector(IWebElement element)
        {
            return element.IsElementPresent(By.CssSelector(".sf-selector-modal"));
        }

        void SelectPrivate(string name)
        {
            var button = this.Element.WaitElementVisible(By.CssSelector("button[name={0}]".FormatWith(name)));
            button.Click();
        }
    }

    public static class SelectorModalExtensions
    {
        public static SelectorModalProxy AsSelectorModal(this IWebElement modal)
        {
            return new SelectorModalProxy(modal);
        }
    }
}
