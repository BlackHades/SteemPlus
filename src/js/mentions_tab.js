
var token_mention_tab=null;
var aut=null;
var rewardBalanceMentionsTab=null;
var recentClaimsMentionsTab=null;
var steemPriceMentionsTab=null;
var mentionTabStarted=false;
var mentionsTabPostsComments=null;
var downloadingData=false;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if(request.to=='mentions_tab'){
    aut=request.data.user;
    if(request.order==='start'&&token_mention_tab==null)
    {
      token_mention_tab=request.token;
      rewardBalanceMentionsTab=request.data.rewardBalance;
      recentClaimsMentionsTab=request.data.recentClaims;
      steemPriceMentionsTab=request.data.steemPrice;

      createTab();

      mentionTabStarted=true;
    }
    else if(request.order==='click'&&token_mention_tab==request.token)
    {
      rewardBalanceMentionsTab=request.data.rewardBalance;
      recentClaimsMentionsTab=request.data.recentClaims;
      steemPriceMentionsTab=request.data.steemPrice;
      createTab();
    }
    else if(request.order==='notif'&&token_mention_tab==request.token)
    {
      rewardBalanceMentionsTab=request.data.rewardBalance;
      recentClaimsMentionsTab=request.data.recentClaims;
      steemPriceMentionsTab=request.data.steemPrice;

      if(mentionTabStarted)
        createTab();
    }
  }
});

function createTab()
{
  window.SteemPlus.Tabs.createTab({
    id: 'mentions',
    title: 'Mentions',
    enabled: true,
    createTab: createMentionsTab
  });
  if(window.location.href.includes('#mentions'))
  window.SteemPlus.Tabs.showTab('mentions');
}

function createMentionsTab(mentionsTab) {

  mentionsTab.html('<div class="row">\
     <div class="UserProfile__tab_content UserProfile__tab_content_smi UserProfile__tab_content_MentionsTab column layout-list">\
        <article class="articles">\
        <div class="MentionsTab" style="display: none;">\
          <h1 class="articles__h1" style="margin-bottom:20px">\
            Mentions\
            <div class="thanks-mentions">\
              Thanks <a href="/@arcange" class="smi-navigate">@arcange</a> for the SteemSQL\
            </div>\
          </h1>\
          <hr class="articles__hr"/>\
          <div class="switch-field" style="margin-bottom: -4px;">\
            <input type="radio" id="mentions-type-posts" name="mentions-type" class="mentions-type" value="posts" checked/>\
            <label for="mentions-type-posts" class="mentions-type" >Posts</label>\
            <input type="radio" id="mentions-type-comments" name="mentions-type" class="mentions-type" value="comments" />\
            <label for="mentions-type-comments" class="mentions-type">Comments</label>\
            <input type="radio" id="mentions-type-both" name="mentions-type" class="mentions-type" value="both" />\
            <label for="mentions-type-both" class="mentions-type">Both</label>\
          </div>\
          <div id="posts_list" class="PostsList" style="margin-top: 30px;">\
            <ul class="PostsList__summaries hfeed" itemscope="" itemtype="http://schema.org/blogPosts">\
            </ul>\
          </div>\
        </div>\
        <center class="MentionsTabLoading">\
           <div class="LoadingIndicator circle">\
              <div></div>\
           </div>\
        </center>\
        <center class="MentionsTabLoadMore" style="display: none;">\
           <button>\
            Load more... \
          </button>\
        </center>\
        </article>\
     </div>\
  </div>');

  mentionsTab.find('.MentionsTabLoadMore button').on('click', function(){
    // Load more
    displayMentions(mentionsTab, window.SteemPlus.Utils.getPageAccountName(), false);
  });
  mentionsTab.find('.mentions-type').on('change', function() {
    // Change display
    var typeMention = (mentionsTab.find('.mentions-type:checked')[0].value);
    displayMentions(mentionsTab, typeMention ,window.SteemPlus.Utils.getPageAccountName(), true);
  });
  // Display mentions in post
  displayMentions(mentionsTab,'posts', window.SteemPlus.Utils.getPageAccountName(),false);
};

// Display posts or comments or boths
// @parameter mentionsTab : jquery object, tab
// @parameter type : represent the selected element (Posts, Comments or Both)
// @parameter usernamePageMentions : selected user
// @parameter reset : need to reset UI or not
function displayMentions(mentionsTab, type, usernamePageMentions,reset)
{
  if(mentionsTabPostsComments===null&&!downloadingData)
  {
    console.log("Start data downloading");
    $.ajax({
      type: "GET",
      beforeSend: function(xhttp) {
        downloadingData=true;
        xhttp.setRequestHeader("Content-type", "application/json");
        xhttp.setRequestHeader("X-Parse-Application-Id", chrome.runtime.id);
        console.log(xhttp);
      },
      
        url: 'http://steemplus-api.herokuapp.com/api/get-mentions/'+ usernamePageMentions,
      success: function(result) {

        mentionsTabPostsComments = result;
        createRows(mentionsTab, type, reset);
        downloadingData = false;
      },
      error: function(msg) {
        downloadingData = false;
        if($('.error-mentions-label').length===0){
          var errorLabel = document.createElement('h2');
          $(errorLabel).addClass('articles__h1');
          $(errorLabel).addClass('error-mentions-label');
          $(errorLabel).append('Looks like we are having trouble retrieving information from steemSQL. Please try again later.');
          $('.MentionsTabLoading').hide();
          $('.articles').prepend(errorLabel);
        }
      }
    });
  }
  else
  {
    if(downloadingData)
    {
      console.log("downloading data");
      // wait because data already downloading
      setTimeout(function(){
        displayMentions(mentionsTab, type, usernamePageMentions,reset);
      },250);
    }
    else
    {
      console.log("already downloaded");
      // display with local data
      createRows(mentionsTab, type, reset);
    }
  }
  
}

function createRows(mentionsTab, type, reset)
{
  if(reset)
  {
    //delete everything
    mentionsTab.find('.PostsList__summaries').empty();
  }

  var listMentions = mentionsTab.find('.PostsList__summaries');
  mentionsTabPostsComments.forEach(function(mentionTabElement){
    if(type==='posts'&&mentionTabElement.parent_author==='')
    {
      // Create row posts
      var el = createSummaryMention(mentionTabElement);
      listMentions.append(el);
    }
    else if(type==='comments'&&mentionTabElement.parent_author!=='')
    {
      // Create comments
      var el = createSummaryMention(mentionTabElement);
      listMentions.append(el);
    }
    else if(type==='both')
    {
      // Create both
      var el = createSummaryMention(mentionTabElement);
      listMentions.append(el);
    }
  });

  mentionsTab.find('.MentionsTabLoading').hide();
  mentionsTab.find('.MentionsTab').show();
}

  


// Create one summary
function createSummaryMention(mentionItem)
{
  var payoutValueMentionTab = (mentionItem.total_payout_value === 0 ? mentionItem.pending_payout_value : mentionItem.total_payout_value);
  var payoutTextMentionTab = (mentionItem.total_payout_value === 0 ? "Potential Payout " : "Total Payout ");

  var title = mentionItem.title;


  var summaryMention = $('<li>\
    <article class="PostSummary hentry with-image" itemscope="" itemtype="http://schema.org/blogPost">\
        <div class="PostSummary__header show-for-small-only">\
            <h3 class="entry-title"> <a href="/' + mentionItem.permlink + '">' + mentionTitle + '</a> </h3>\
        </div>\
        <div class="PostSummary__time_author_category_small show-for-small-only">\
          <span class="vcard">\
            <a href="/' + mentionItem.permlink + '">\
              <span title="' + new Date(mentionItem.created) + '" class="updated"><span>' + moment(new Date(mentionItem.created)).fromNow() + '</span></span>\
            </a> by \
            <span class="author" itemprop="author" itemscope="" itemtype="http://schema.org/Person">\
              <strong>\
                <a href="/@' + mentionItem.author + '">' + mentionItem.author + '</a>\
              </strong>\
            </span> in \
            <strong>\
              <a href="/trending/' + mentionItem.category + '">' + mentionItem.category + '</a>\
            </strong>\
          </span>\
        </div>\
        <span name="imgUrl" class="PostSummary__image" style="background-image: url(\'https://steemitimages.com/256x512/http://imgtank.online/indigo/iphone-photo-236541373.png\');"></span>\
        <div class="PostSummary__content">\
            <div class="PostSummary__header show-for-medium">\
                <h3 class="entry-title"> <a href="/' + mentionItem.permlink + '">' + mentionItem.title + '</a> </h3> </div>\
            <div class="PostSummary__body entry-content">\
              <a href="/' + mentionItem.permlink + '">' + stripHTML(mentionItem.body) + '…</a>\
            </div>\
            <div class="PostSummary__footer"> <span class="Voting">\
              <span class="Voting__inner">\
              <div class="DropdownMenu">\
                <a><span><span class="FormattedAsset "><span class="prefix">$</span><span class="integer">' + payoutValueMentionTab + '</span><span class="Icon dropdown-arrow" style="display: inline-block; width: 1.12rem; height: 1.12rem;"> <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" enable-background="new 0 0 512 512" xml:space="preserve"><g><polygon points="128,90 256,218 384,90"></polygon></g></svg> </span> </span></a>\
                <ul class="VerticalMenu menu vertical VerticalMenu">\
                    <li> <span> ' + payoutTextMentionTab + ' $' + payoutValueMentionTab + ' </span> </li>\
                    <li> <span> <span title="' + new Date(mentionItem.created) + '"><span>' + moment(new Date(mentionItem.created)).fromNow() + '</span></span></span></li>\
                </ul>\
            </div>\
            </span>\
            </span> <span class="VotesAndComments"> <span class="VotesAndComments__votes" title="' + mentionItem.net_votes + ' votes"> <span class="Icon chevron-up-circle Icon_1x" style="display: inline-block; width: 1.12rem; height: 1.12rem;"> <svg enable-background="new 0 0 33 33" version="1.1" viewBox="0 0 33 33" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="Chevron_Up_Circle"><circle cx="16" cy="16" r="15" stroke="#121313" fill="none"></circle><path d="M16.699,11.293c-0.384-0.38-1.044-0.381-1.429,0l-6.999,6.899c-0.394,0.391-0.394,1.024,0,1.414 c0.395,0.391,1.034,0.391,1.429,0l6.285-6.195l6.285,6.196c0.394,0.391,1.034,0.391,1.429,0c0.394-0.391,0.394-1.024,0-1.414 L16.699,11.293z" fill="#121313"></path></g></svg> </span>' + mentionItem.net_votes + '</span></a>\
            </span>\
            </span> <span class="PostSummary__time_author_category"><span class="show-for-medium"> <span class="vcard"> <a href="/' + mentionItem.permlink + '"> <span title="' + new Date(mentionItem.created) + '" class="updated"><span>' + moment(new Date(mentionItem.created)).fromNow() + '</span></span>\
            </a> by <span class="author" itemprop="author" itemscope="" itemtype="http://schema.org/Person"> <strong> <a href="/@' + mentionItem.author + '">' + mentionItem.author + '</a> </strong></span> in <strong> <a href="/trending/' + mentionItem.category + '">' + mentionItem.category + '</a> </strong> </span>\
            </span>\
            </span>\
        </div>\
        </div>\
    </article>\
  </li>');

  return summaryMention;
}

function openPost(url) {
  var postWindow = window.open();
  postWindow.opener = null;
  postWindow.location = url;
}

function stripHTML(text)
{
  var tmp = document.createElement("DIV");
  tmp.innerHTML = text;
  return tmp.textContent || tmp.innerText || "";
}