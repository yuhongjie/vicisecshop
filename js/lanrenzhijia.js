/* 代码整理：懒人之家 www.lanrenzhijia.com */
jQuery(function(){
  jQuery(".fixedBox ul.fixedBoxList li.fixeBoxLi").hover(
	function (){
	  jQuery(this).find('span.fixeBoxSpan').addClass("hover");
	  jQuery(this).addClass("hover");
	},
	function () {
	 jQuery(this).find('span.fixeBoxSpan').removeClass("hover");
	  jQuery(this).removeClass("hover");
	}
  );
  jQuery('.BackToTop').click(function(){$('html,body').animate({scrollTop: '0px'}, 800);});
  var oDate=new Date();
  var iHour=oDate.getHours();
  if(iHour>8 && iHour<22){
    jQuery(".Service").addClass("startWork");
    jQuery(".Service").removeClass("Commuting");
  }else{
    jQuery(".Service").addClass("Commuting");
    jQuery(".Service").removeClass("startWork");
  };
});

jQuery(function(){
  jQuery('.listLeftMenu dl dt').click(function(){
    var but_list=jQuery(this).attr('rel');
    if(but_list=='off'){
      jQuery(this).attr('rel','on');
	  jQuery('.listLeftMenu dl').removeClass('off');
	  jQuery(this).parent().addClass('on');
    }else{
      jQuery(this).attr('rel','off');
	  jQuery(this).parent().removeClass('on');
	  jQuery(this).parent().addClass('off');
    }
  });
});

//滑动式效果
  var timer;
 jQuery(function(){
     jQuery(window).scroll(function(){
          clearInterval(timer);
          var topScroll=getScroll();
          var topDiv="200px";
          var top=topScroll+parseInt(topDiv);
          timer=setInterval(function(){
                  //$(".test").css("top", top+"px");
                  jQuery(".fixedBox").animate({"top":top},100);
          },100)
      })
  })
  function getScroll(){
           var bodyTop = 0;  
           if (typeof window.pageYOffset != 'undefined') {  
                   bodyTop = window.pageYOffset;  
           } else if (typeof document.compatMode != 'undefined' && document.compatMode != 'BackCompat') {  
                   bodyTop = document.documentElement.scrollTop;  
           }  
           else if (typeof document.body != 'undefined') {  
                   bodyTop = document.body.scrollTop;  
           }  
           return bodyTop
  }
/* 代码整理：懒人之家 www.lanrenzhijia.com */