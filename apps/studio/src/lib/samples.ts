/**
 * Sample Sitefinity .NET Core Renderer widget models
 * Used in the converter UI to demonstrate the parser.
 */

export const HERO_WIDGET_SAMPLE = `using System.ComponentModel;
using Telerik.Sitefinity.Web.UI.ContentUI.Enums;

namespace SitefinityProject.Widgets.Hero
{
    /// <summary>
    /// Model for the Hero widget.
    /// </summary>
    public class HeroWidgetModel
    {
        [DisplayName("Title")]
        [Description("The main heading displayed in the hero section.")]
        [ContentSection("Content", 0)]
        public string Title { get; set; }

        [DisplayName("Subtitle")]
        [Description("Supporting text below the title.")]
        [ContentSection("Content", 1)]
        public string Subtitle { get; set; }

        [DisplayName("Background Image URL")]
        [ContentSection("Design", 0)]
        public string BackgroundImageUrl { get; set; }

        [DisplayName("Button Text")]
        [ContentSection("Call to Action", 0)]
        public string ButtonText { get; set; }

        [DisplayName("Button URL")]
        [ContentSection("Call to Action", 1)]
        public string ButtonUrl { get; set; }

        [DisplayName("Show Button")]
        [DefaultValue(true)]
        [ContentSection("Call to Action", 2)]
        public bool ShowButton { get; set; }

        [DisplayName("Overlay Opacity")]
        [Description("0–100 percent overlay darkness over the background image.")]
        [DefaultValue(50)]
        [ContentSection("Design", 1)]
        public int OverlayOpacity { get; set; }
    }
}`;

export const FAQ_WIDGET_SAMPLE = `using System.Collections.Generic;
using System.ComponentModel;

namespace SitefinityProject.Widgets.Faq
{
    public class FaqWidgetModel
    {
        [DisplayName("Section Title")]
        [ContentSection("Content")]
        public string SectionTitle { get; set; }

        [DisplayName("Show Search Bar")]
        [DefaultValue(false)]
        public bool ShowSearch { get; set; }

        [DisplayName("Number of Items Visible")]
        [DefaultValue(5)]
        public int VisibleCount { get; set; }

        [DisplayName("Items")]
        public List<string> Items { get; set; }
    }
}`;

export const CARD_GRID_WIDGET_SAMPLE = `using System.ComponentModel;

namespace SitefinityProject.Widgets.CardGrid
{
    public class CardGridWidgetModel
    {
        [DisplayName("Section Title")]
        [ContentSection("Content")]
        public string Title { get; set; }

        [DisplayName("Number of Columns")]
        [DefaultValue(3)]
        [ContentSection("Layout")]
        public int Columns { get; set; }

        [DisplayName("Show Card Images")]
        [DefaultValue(true)]
        [ContentSection("Layout")]
        public bool ShowImages { get; set; }

        [DisplayName("Card CTA Label")]
        [DefaultValue("Read more")]
        [ContentSection("Content")]
        public string CtaLabel { get; set; }

        [DisplayName("Content Type Name")]
        [ContentSection("Data")]
        public string ContentTypeName { get; set; }
    }
}`;
